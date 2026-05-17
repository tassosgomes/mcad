package br.com.ecad.distribuicao.application.services;

import br.com.ecad.distribuicao.domain.calculo.FonogramaOwnership;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.CreditoRetidoReavaliacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.ResultadoReavaliacaoRetido;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.domain.interfaces.CreditoLiberacaoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRetidoReavaliacaoRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreditoRetidoLiberacaoService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CreditoRetidoLiberacaoService.class);
    private static final String PREVISTAS_METRIC = "distribuicao.liberacao.previstas.total";
    private static final String EFETIVADAS_METRIC = "distribuicao.liberacao.efetivadas.total";
    private static final String VALOR_METRIC = "distribuicao.liberacao.valor";
    private static final String REAVALIACAO_METRIC = "distribuicao.liberacao.reavaliacao.total";

    private final CreditoLiberacaoRepository creditoLiberacaoRepository;
    private final CreditoRetidoReavaliacaoRepository creditoRetidoReavaliacaoRepository;
    private final CreditoRepository creditoRepository;
    private final CadastroOwnershipClient cadastroOwnershipClient;
    private final MeterRegistry meterRegistry;

    public CreditoRetidoLiberacaoService(
            CreditoLiberacaoRepository creditoLiberacaoRepository,
            CreditoRetidoReavaliacaoRepository creditoRetidoReavaliacaoRepository,
            CreditoRepository creditoRepository,
            CadastroOwnershipClient cadastroOwnershipClient,
            MeterRegistry meterRegistry) {
        this.creditoLiberacaoRepository = Objects.requireNonNull(
                creditoLiberacaoRepository,
                "creditoLiberacaoRepository must not be null");
        this.creditoRetidoReavaliacaoRepository = Objects.requireNonNull(
                creditoRetidoReavaliacaoRepository,
                "creditoRetidoReavaliacaoRepository must not be null");
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
        this.cadastroOwnershipClient = Objects.requireNonNull(
                cadastroOwnershipClient,
                "cadastroOwnershipClient must not be null");
        this.meterRegistry = Objects.requireNonNull(meterRegistry, "meterRegistry must not be null");
    }

    @Transactional
    public ResultadoLiberacaoRetidos preverLiberacoes(ProcessoDistribuicao processo, String bearerToken) {
        Objects.requireNonNull(processo, "processo must not be null");
        List<Credito> candidatos = creditoLiberacaoRepository.findCandidatosRetidos(
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo());
        if (candidatos.isEmpty()) {
            return ResultadoLiberacaoRetidos.empty();
        }

        OwnershipSnapshot snapshot = cadastroOwnershipClient.buscarOwnership(
                candidatos.stream().map(Credito::getObraId).collect(Collectors.toSet()),
                candidatos.stream()
                        .map(Credito::getFonogramaId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet()),
                bearerToken);
        SnapshotIndex index = indexar(snapshot);
        Instant avaliadoEm = Instant.now();

        List<CreditoLiberacao> liberacoes = new java.util.ArrayList<>();
        List<CreditoRetidoReavaliacao> reavaliacoes = new java.util.ArrayList<>();
        for (Credito candidato : candidatos) {
            ReavaliacaoResultado resultado = reavaliar(candidato, index);
            reavaliacoes.add(CreditoRetidoReavaliacao.registrar(
                    candidato.getId(),
                    processo.getId(),
                    resultado.resultado(),
                    resultado.detalhe(),
                    avaliadoEm));
            recordReavaliacao(resultado.resultado());
            if (resultado.resultado() == ResultadoReavaliacaoRetido.ELEGIVEL) {
                liberacoes.add(CreditoLiberacao.prevista(candidato, processo, avaliadoEm));
            }
        }

        List<CreditoRetidoReavaliacao> reavaliacoesSalvas = creditoRetidoReavaliacaoRepository.saveAll(reavaliacoes);
        List<CreditoLiberacao> liberacoesSalvas = creditoLiberacaoRepository.saveAll(liberacoes);
        BigDecimal valorTotal = somarValorLiberado(liberacoesSalvas);
        recordLiberacoes(PREVISTAS_METRIC, "prevista", processo.getRubricaSigla(), liberacoesSalvas, valorTotal);
        LOGGER.info(
                "distribuicao.liberacao.previewed processoId={} total={} valorTotal={}",
                processo.getId(),
                liberacoesSalvas.size(),
                valorTotal);
        return new ResultadoLiberacaoRetidos(
                liberacoesSalvas,
                reavaliacoesSalvas,
                liberacoesSalvas.size(),
                valorTotal);
    }

    @Transactional
    public ResultadoLiberacaoRetidos efetivarLiberacoes(ProcessoDistribuicao processo, Instant liberadoEm) {
        Objects.requireNonNull(processo, "processo must not be null");
        Objects.requireNonNull(liberadoEm, "liberadoEm must not be null");
        List<CreditoLiberacao> liberacoes = creditoLiberacaoRepository.findPrevistasByProcessoLiberacaoId(processo.getId());
        for (CreditoLiberacao liberacao : liberacoes) {
            Credito credito = creditoRepository.findByIdForUpdate(liberacao.getCreditoRetidoId())
                    .orElseThrow(() -> new NotFoundException(
                            "Crédito retido não encontrado: " + liberacao.getCreditoRetidoId()));
            credito.liberar(processo.getId(), liberadoEm);
            liberacao.efetivar(liberadoEm);
        }
        BigDecimal valorTotal = somarValorLiberado(liberacoes);
        recordLiberacoes(EFETIVADAS_METRIC, "efetivada", processo.getRubricaSigla(), liberacoes, valorTotal);
        LOGGER.info(
                "distribuicao.liberacao.effective processoId={} total={} valorTotal={}",
                processo.getId(),
                liberacoes.size(),
                valorTotal);
        return new ResultadoLiberacaoRetidos(liberacoes, List.of(), liberacoes.size(), valorTotal);
    }

    @Transactional
    public int cancelarLiberacoesPrevistas(UUID processoId, Instant canceladoEm) {
        Objects.requireNonNull(processoId, "processoId must not be null");
        Objects.requireNonNull(canceladoEm, "canceladoEm must not be null");
        int total = creditoLiberacaoRepository.cancelarPrevistasByProcessoLiberacaoId(processoId, canceladoEm);
        LOGGER.info("distribuicao.liberacao.cancelled processoId={} total={}", processoId, total);
        return total;
    }

    private ReavaliacaoResultado reavaliar(Credito credito, SnapshotIndex index) {
        if (credito.getValorCredito().compareTo(BigDecimal.ZERO) <= 0) {
            return new ReavaliacaoResultado(
                    ResultadoReavaliacaoRetido.OBRA_NAO_DISTRIBUIVEL,
                    "valor_credito_nao_positivo");
        }

        ObraOwnership obra = index.obras().get(credito.getObraId());
        if (obra == null) {
            return new ReavaliacaoResultado(
                    ResultadoReavaliacaoRetido.OBRA_NAO_DISTRIBUIVEL,
                    "obra_nao_encontrada");
        }

        String statusObra = normalize(obra.status());
        if ("PENDENTE".equals(statusObra)) {
            return new ReavaliacaoResultado(ResultadoReavaliacaoRetido.OBRA_PENDENTE, null);
        }
        if ("BLOQUEADA".equals(statusObra)) {
            return new ReavaliacaoResultado(ResultadoReavaliacaoRetido.OBRA_BLOQUEADA, null);
        }
        if (!"LIBERADA".equals(statusObra) && !"LIBERADO".equals(statusObra)) {
            return new ReavaliacaoResultado(
                    ResultadoReavaliacaoRetido.OBRA_NAO_DISTRIBUIVEL,
                    "status_obra=" + obra.status());
        }

        if (credito.getCategoria() == CategoriaCredito.AUTORAL) {
            return reavaliarParticipacao(credito, obra.titularidades());
        }
        return reavaliarCreditoConexo(credito, index);
    }

    private ReavaliacaoResultado reavaliarCreditoConexo(Credito credito, SnapshotIndex index) {
        if (credito.getFonogramaId() == null) {
            return new ReavaliacaoResultado(
                    ResultadoReavaliacaoRetido.PARTICIPACAO_NAO_ENCONTRADA,
                    "credito_conexo_sem_fonograma");
        }
        FonogramaOwnership fonograma = index.fonogramas().get(credito.getFonogramaId());
        if (fonograma == null || !credito.getObraId().equals(fonograma.obraId())) {
            return new ReavaliacaoResultado(
                    ResultadoReavaliacaoRetido.PARTICIPACAO_NAO_ENCONTRADA,
                    "fonograma_original_nao_encontrado");
        }
        return reavaliarParticipacao(credito, fonograma.participacoes());
    }

    private ReavaliacaoResultado reavaliarParticipacao(
            Credito credito,
            List<ParticipacaoOwnership> participacoes) {
        ParticipacaoOwnership participacao = participacoes.stream()
                .filter(item -> credito.getTitularId().equals(item.titularId()))
                .filter(item -> item.categoria() == credito.getCategoria())
                .findFirst()
                .orElse(null);
        if (participacao == null) {
            return new ReavaliacaoResultado(ResultadoReavaliacaoRetido.PARTICIPACAO_NAO_ENCONTRADA, null);
        }
        if (!hasText(participacao.associacaoSigla())) {
            return new ReavaliacaoResultado(ResultadoReavaliacaoRetido.TITULAR_SEM_ASSOCIACAO, null);
        }
        return new ReavaliacaoResultado(ResultadoReavaliacaoRetido.ELEGIVEL, null);
    }

    private SnapshotIndex indexar(OwnershipSnapshot snapshot) {
        Map<UUID, ObraOwnership> obras = new HashMap<>();
        for (ObraOwnership obra : snapshot.obras()) {
            obras.put(obra.obraId(), obra);
        }
        Map<UUID, FonogramaOwnership> fonogramas = new HashMap<>();
        for (FonogramaOwnership fonograma : snapshot.fonogramas()) {
            fonogramas.put(fonograma.fonogramaId(), fonograma);
        }
        return new SnapshotIndex(obras, fonogramas);
    }

    private void recordReavaliacao(ResultadoReavaliacaoRetido resultado) {
        Counter.builder(REAVALIACAO_METRIC)
                .tag("resultado", resultado.name())
                .register(meterRegistry)
                .increment();
    }

    private void recordLiberacoes(
            String counterName,
            String status,
            String rubricaSigla,
            List<CreditoLiberacao> liberacoes,
            BigDecimal valorTotal) {
        if (!liberacoes.isEmpty()) {
            Counter.builder(counterName)
                    .tag("rubrica", rubricaSigla)
                    .register(meterRegistry)
                    .increment(liberacoes.size());
            DistributionSummary.builder(VALOR_METRIC)
                    .tag("status", status)
                    .tag("rubrica", rubricaSigla)
                    .register(meterRegistry)
                    .record(valorTotal.doubleValue());
        }
    }

    private BigDecimal somarValorLiberado(List<CreditoLiberacao> liberacoes) {
        return liberacoes.stream()
                .map(CreditoLiberacao::getValorLiberado)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record ResultadoLiberacaoRetidos(
            List<CreditoLiberacao> liberacoes,
            List<CreditoRetidoReavaliacao> reavaliacoes,
            int total,
            BigDecimal valorTotal) {

        public static ResultadoLiberacaoRetidos empty() {
            return new ResultadoLiberacaoRetidos(List.of(), List.of(), 0, BigDecimal.ZERO.setScale(2));
        }
    }

    private record SnapshotIndex(
            Map<UUID, ObraOwnership> obras,
            Map<UUID, FonogramaOwnership> fonogramas) {
    }

    private record ReavaliacaoResultado(
            ResultadoReavaliacaoRetido resultado,
            String detalhe) {
    }
}
