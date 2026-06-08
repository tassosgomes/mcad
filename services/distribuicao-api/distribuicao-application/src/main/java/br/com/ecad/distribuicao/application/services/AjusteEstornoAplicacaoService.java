package br.com.ecad.distribuicao.application.services;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoLinhaRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço de aplicação responsável por prever, efetivar e cancelar ajustes de estorno
 * durante o ciclo de cálculo/finalização/cancelamento de um processo de distribuição.
 *
 * <p>O algoritmo de alocação monetária distribui o valor líquido do ajuste em linhas negativas
 * proporcionais aos créditos do processo de origem, usando o método de maior resto para garantir
 * que a soma das linhas feche exatamente com {@code valorAjusteLiquido * -1}.
 */
@Service
public class AjusteEstornoAplicacaoService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AjusteEstornoAplicacaoService.class);
    private static final MathContext MC_QUOTA = new MathContext(20, RoundingMode.HALF_UP);

    private final AjusteEstornoRepository ajusteRepo;
    private final AjusteEstornoLinhaRepository linhaRepo;
    private final AjusteEstornoHistoricoRepository historicoRepo;
    private final CreditoRepository creditoRepo;
    private final ProcessoRepository processoRepo;
    private final OutboxEventWriter outboxEventWriter;

    public AjusteEstornoAplicacaoService(
            AjusteEstornoRepository ajusteRepo,
            AjusteEstornoLinhaRepository linhaRepo,
            AjusteEstornoHistoricoRepository historicoRepo,
            CreditoRepository creditoRepo,
            ProcessoRepository processoRepo,
            OutboxEventWriter outboxEventWriter) {
        this.ajusteRepo = Objects.requireNonNull(ajusteRepo, "ajusteRepo must not be null");
        this.linhaRepo = Objects.requireNonNull(linhaRepo, "linhaRepo must not be null");
        this.historicoRepo = Objects.requireNonNull(historicoRepo, "historicoRepo must not be null");
        this.creditoRepo = Objects.requireNonNull(creditoRepo, "creditoRepo must not be null");
        this.processoRepo = Objects.requireNonNull(processoRepo, "processoRepo must not be null");
        this.outboxEventWriter = Objects.requireNonNull(outboxEventWriter, "outboxEventWriter must not be null");
    }

    /**
     * Bloqueia o cálculo do processo se houver ajuste PROCESSO_CRIADO_DESATUALIZADO vinculado.
     * Deve ser chamado no início de {@code CalcularProcessoCommandHandler}, antes de qualquer
     * operação de cálculo.
     *
     * @throws PreRequisitosException se o processo referencia snapshot de verba desatualizado.
     */
    public void validarCalculoPermitido(ProcessoDistribuicao processo) {
        Objects.requireNonNull(processo, "processo must not be null");
        if (ajusteRepo.existsBloqueioSnapshotDesatualizado(processo.getId())) {
            throw new PreRequisitosException(
                    "Processo " + processo.getId() + " tem ajuste pendente classificado como "
                    + "PROCESSO_CRIADO_DESATUALIZADO. Recrie ou refresheie o snapshot de verba "
                    + "antes de calcular.");
        }
    }

    /**
     * Seleciona ajustes pendentes elegíveis para o processo em cálculo, aloca linhas negativas
     * proporcionais aos créditos do processo de origem e marca cada ajuste como PREVISTO.
     *
     * <p>Ajustes com processo de origem sem créditos válidos são marcados como ERRO_INTEGRIDADE
     * e não impedem o prosseguimento dos demais.
     *
     * @param processo    processo de distribuição em cálculo (status CRIADO).
     * @param previstoEm  instante de referência para a previsão.
     * @return resumo com total e valorTotal negativo (ou zero se nenhum elegível).
     */
    @Transactional
    public ResultadoAjustesEstorno preverAjustes(ProcessoDistribuicao processo, Instant previstoEm) {
        Objects.requireNonNull(processo, "processo must not be null");
        Objects.requireNonNull(previstoEm, "previstoEm must not be null");

        // 1. Buscar pendentes da rubrica com lock pessimista (SKIP LOCKED)
        List<AjusteEstorno> pendentes = ajusteRepo.findPendentesElegiveisForUpdate(
                processo.getRubricaSigla(), processo.getPeriodo());

        // 2. Filtrar pelo critério de período de aplicação (regras de elegibilidade)
        List<AjusteEstorno> elegiveis = filtrarElegiveis(pendentes, processo);

        if (elegiveis.isEmpty()) {
            return ResultadoAjustesEstorno.empty();
        }

        // 3. Para cada elegível: buscar créditos da origem e alocar
        List<AjusteEstornoLinha> todasLinhas = new ArrayList<>();
        List<AjusteEstorno> aplicados = new ArrayList<>();
        BigDecimal somaValorAplicado = BigDecimal.ZERO;

        for (AjusteEstorno ajuste : elegiveis) {
            List<Credito> creditos = creditoRepo.findByProcessoIdForAjuste(ajuste.getProcessoOrigemId());
            BigDecimal totalOrigem = creditos.stream()
                    .map(Credito::getValorCredito)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (creditos.isEmpty() || totalOrigem.compareTo(BigDecimal.ZERO) <= 0) {
                ajuste.marcarErroIntegridade("Processo de origem sem créditos válidos para alocação", previstoEm);
                ajusteRepo.save(ajuste);
                historicoRepo.save(AjusteEstornoHistorico.registrar(
                        ajuste.getId(),
                        StatusAjusteEstorno.ERRO_INTEGRIDADE,
                        ajuste.getProcessoOrigemId(),
                        previstoEm,
                        "Sem créditos para alocação"));
                LOGGER.warn(
                        "distribuicao.ajuste_estorno.erro_integridade: ajusteId={} processoOrigemId={}",
                        ajuste.getId(), ajuste.getProcessoOrigemId());
                continue; // não impede demais ajustes
            }

            // 4. Alocação por centavos — método de maior resto
            List<AjusteEstornoLinha> linhas = alocar(ajuste, processo.getId(), creditos, totalOrigem, previstoEm);
            todasLinhas.addAll(linhas);

            // valorAplicado é negativo: -valorAjusteLiquido
            BigDecimal valorAplicado = ajuste.getValorAjusteLiquido().negate();

            ajuste.prever(processo.getId(), valorAplicado, previstoEm);
            ajusteRepo.save(ajuste);
            historicoRepo.save(AjusteEstornoHistorico.registrar(
                    ajuste.getId(),
                    StatusAjusteEstorno.PREVISTO,
                    processo.getId(),
                    previstoEm,
                    "Previsão no cálculo"));
            aplicados.add(ajuste);
            somaValorAplicado = somaValorAplicado.add(valorAplicado);
        }

        linhaRepo.saveAll(todasLinhas);
        LOGGER.info(
                "distribuicao.ajuste_estorno.previsto: processoId={} total={} valorTotal={}",
                processo.getId(), aplicados.size(), somaValorAplicado);
        return new ResultadoAjustesEstorno(aplicados, todasLinhas, aplicados.size(), somaValorAplicado);
    }

    /**
     * Efetiva ajustes PREVISTO → APLICADO após finalização do processo.
     * Publica evento {@code distribuicao.ajuste.estorno.aplicado} para cada ajuste efetivado.
     *
     * @param processo    processo de distribuição sendo finalizado.
     * @param aplicadoEm  instante de finalização do processo.
     * @return resumo com total e valorTotal dos ajustes efetivados.
     */
    @Transactional
    public ResultadoAjustesEstorno efetivarAjustes(ProcessoDistribuicao processo, Instant aplicadoEm) {
        Objects.requireNonNull(processo, "processo must not be null");
        Objects.requireNonNull(aplicadoEm, "aplicadoEm must not be null");

        List<AjusteEstorno> previstos = ajusteRepo.findPrevistosByProcessoAplicacaoId(processo.getId());
        if (previstos.isEmpty()) {
            return ResultadoAjustesEstorno.empty();
        }

        List<AjusteEstornoLinha> todasLinhas = linhaRepo.findByProcessoAplicacaoId(processo.getId());
        BigDecimal somaValorAplicado = BigDecimal.ZERO;

        for (AjusteEstorno ajuste : previstos) {
            ajuste.aplicar(aplicadoEm);
            ajusteRepo.save(ajuste);
            historicoRepo.save(AjusteEstornoHistorico.registrar(
                    ajuste.getId(),
                    StatusAjusteEstorno.APLICADO,
                    processo.getId(),
                    aplicadoEm,
                    "Aplicação efetivada na finalização"));
            somaValorAplicado = somaValorAplicado.add(ajuste.getValorAplicado());

            int totalLinhasAjuste = (int) todasLinhas.stream()
                    .filter(l -> l.getAjusteId().equals(ajuste.getId()))
                    .count();
            publicarAplicado(ajuste, processo, totalLinhasAjuste, aplicadoEm);

            LOGGER.info(
                    "distribuicao.ajuste_estorno.aplicado: ajusteId={} processoAplicacaoId={} valor={}",
                    ajuste.getId(), processo.getId(), ajuste.getValorAplicado());
        }

        return new ResultadoAjustesEstorno(previstos, todasLinhas, previstos.size(), somaValorAplicado);
    }

    /**
     * Cancela previsões: ajustes PREVISTO voltam para PENDENTE_APLICACAO e suas linhas são excluídas.
     * Chamado quando o processo de aplicação é cancelado.
     *
     * <p>Não altera ajustes já APLICADO.
     *
     * @param processoId   ID do processo de aplicação sendo cancelado.
     * @param canceladoEm  instante do cancelamento.
     * @return resumo com total de ajustes revertidos.
     */
    @Transactional
    public ResultadoAjustesEstorno cancelarPrevisoes(UUID processoId, Instant canceladoEm) {
        Objects.requireNonNull(processoId, "processoId must not be null");
        Objects.requireNonNull(canceladoEm, "canceladoEm must not be null");

        List<AjusteEstorno> previstos = ajusteRepo.findPrevistosByProcessoAplicacaoId(processoId);
        if (previstos.isEmpty()) {
            return ResultadoAjustesEstorno.empty();
        }

        BigDecimal somaDevolvida = BigDecimal.ZERO;
        for (AjusteEstorno ajuste : previstos) {
            linhaRepo.deleteByAjusteIdAndProcessoAplicacaoId(ajuste.getId(), processoId);
            BigDecimal valorAntes = ajuste.getValorAplicado() != null
                    ? ajuste.getValorAplicado()
                    : BigDecimal.ZERO;
            somaDevolvida = somaDevolvida.add(valorAntes);
            ajuste.cancelarPrevisao(canceladoEm);
            ajusteRepo.save(ajuste);
            historicoRepo.save(AjusteEstornoHistorico.registrar(
                    ajuste.getId(),
                    StatusAjusteEstorno.CANCELADO,
                    processoId,
                    canceladoEm,
                    "Previsão cancelada com o processo"));
        }

        LOGGER.info(
                "distribuicao.ajuste_estorno.previsoes_canceladas: processoId={} total={}",
                processoId, previstos.size());
        return new ResultadoAjustesEstorno(previstos, List.of(), previstos.size(), somaDevolvida);
    }

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    /**
     * Filtra ajustes pendentes pelos critérios de elegibilidade de período,
     * consultando o status do processo de origem de cada candidato.
     */
    private List<AjusteEstorno> filtrarElegiveis(
            List<AjusteEstorno> pendentes,
            ProcessoDistribuicao processoAplicacao) {

        List<AjusteEstorno> elegiveis = new ArrayList<>();
        for (AjusteEstorno ajuste : pendentes) {
            if (ajuste.getProcessoOrigemId() == null) {
                continue; // sanity guard
            }
            ProcessoDistribuicao origem = processoRepo.findById(ajuste.getProcessoOrigemId()).orElse(null);
            if (origem == null) {
                continue;
            }

            boolean elegivel;
            if (origem.getStatus() == StatusProcesso.CANCELADO) {
                // origem cancelada: pode aplicar em processo da mesma rubrica+período (qualquer)
                elegivel = true;
            } else {
                // FINALIZADO, CALCULADO ou APROVADO: exige período de aplicação posterior
                elegivel = processoAplicacao.getPeriodo()
                        .compareTo(ajuste.getPeriodoOrigem()) > 0;
            }

            if (elegivel) {
                elegiveis.add(ajuste);
            }
        }
        return elegiveis;
    }

    /**
     * Algoritmo de alocação em centavos com método de maior resto.
     *
     * <p>Garante que {@code soma(linhas.valorAjuste) == valorAjusteLiquido * -1}.
     *
     * @param ajuste              ajuste cujo valor líquido será distribuído.
     * @param processoAplicacaoId ID do processo que recebe as linhas.
     * @param creditos            créditos do processo de origem (ordenados por criadoEm/id pela query).
     * @param totalOrigem         soma dos valorCredito dos créditos (> 0).
     * @param previstoEm          instante de criação das linhas.
     * @return lista de linhas com valorAjuste negativo que somam -valorAjusteLiquido.
     */
    private List<AjusteEstornoLinha> alocar(
            AjusteEstorno ajuste,
            UUID processoAplicacaoId,
            List<Credito> creditos,
            BigDecimal totalOrigem,
            Instant previstoEm) {

        BigDecimal valorLiquido = ajuste.getValorAjusteLiquido(); // positivo
        long totalCents = valorLiquido
                .movePointRight(2)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        // --- Passo 1: calcular floor de centavos e resto fracionário por crédito ---
        record Parcial(Credito credito, long floorCents, BigDecimal resto) {}

        List<Parcial> parciais = new ArrayList<>(creditos.size());
        long somaFloor = 0;
        for (Credito c : creditos) {
            // quota exata em reais (alta precisão)
            BigDecimal exata = c.getValorCredito()
                    .multiply(valorLiquido, MC_QUOTA)
                    .divide(totalOrigem, MC_QUOTA);
            BigDecimal exataCents = exata.movePointRight(2); // em centavos exatos
            long floor = exataCents.setScale(0, RoundingMode.FLOOR).longValueExact();
            BigDecimal resto = exataCents.subtract(BigDecimal.valueOf(floor));
            parciais.add(new Parcial(c, floor, resto));
            somaFloor += floor;
        }

        long residuo = totalCents - somaFloor; // >= 0

        // --- Passo 2: distribuir o resíduo (1 centavo cada) por maior resto ---
        // empate: criadoEm ASC, id ASC (mesma ordenação da query findByProcessoIdForAjuste)
        Map<UUID, Long> extraPorCredito = new HashMap<>();
        parciais.stream()
                .sorted(Comparator
                        .<Parcial, BigDecimal>comparing(Parcial::resto, Comparator.reverseOrder())
                        .thenComparing(p -> p.credito().getCriadoEm())
                        .thenComparing(p -> p.credito().getId()))
                .limit(residuo)
                .forEach(p -> extraPorCredito.put(p.credito().getId(), 1L));

        // --- Passo 3: construir linhas (valorAjuste negativo) ---
        List<AjusteEstornoLinha> linhas = new ArrayList<>(parciais.size());
        for (Parcial p : parciais) {
            long cents = p.floorCents() + extraPorCredito.getOrDefault(p.credito().getId(), 0L);
            BigDecimal valorAjuste = BigDecimal.valueOf(cents).movePointLeft(2).negate();
            Credito c = p.credito();
            AjusteEstornoLinha linha = new AjusteEstornoLinha(
                    ajuste.getId(),
                    ajuste.getProcessoOrigemId(),
                    processoAplicacaoId,
                    c.getId(),
                    c.getTitularId(),
                    c.getTitularNome(),
                    c.getObraId(),
                    c.getObraTitulo(),
                    c.getFonogramaId(),
                    c.getCategoria(),
                    c.getSubcategoriaConexa(),
                    c.getValorCredito(),
                    valorAjuste);
            linhas.add(linha);
        }
        return linhas;
    }

    /**
     * Publica evento de outbox {@code distribuicao.ajuste.estorno.aplicado}.
     */
    private void publicarAplicado(
            AjusteEstorno ajuste,
            ProcessoDistribuicao processoAplicacao,
            int totalLinhas,
            Instant aplicadoEm) {

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("ajusteId", ajuste.getId());
        data.put("pagamentoId", ajuste.getPagamentoId());
        data.put("licencaId", ajuste.getLicencaId());
        data.put("rubricaSigla", ajuste.getRubricaSigla());
        data.put("periodoOrigem", ajuste.getPeriodoOrigem());
        data.put("periodoAplicacao", processoAplicacao.getPeriodo());
        data.put("processoOrigemId", ajuste.getProcessoOrigemId());
        data.put("processoAplicacaoId", processoAplicacao.getId());
        data.put("valorEstornadoBruto", ajuste.getValorEstornadoBruto());
        data.put("valorAjusteLiquido", ajuste.getValorAjusteLiquido());
        data.put("valorAplicado", ajuste.getValorAplicado());
        data.put("totalLinhas", totalLinhas);
        data.put("estornadoPor", ajuste.getEstornadoPor());
        data.put("estornadoEm", ajuste.getEstornadoEm());
        data.put("aplicadoEm", aplicadoEm);
        outboxEventWriter.addEvent(
                "distribuicao.ajuste.estorno.aplicado",
                ajuste.getId().toString(),
                data);
    }
}
