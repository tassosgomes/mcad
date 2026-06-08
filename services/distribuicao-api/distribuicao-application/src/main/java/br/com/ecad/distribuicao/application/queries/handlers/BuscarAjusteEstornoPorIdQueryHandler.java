package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.AjusteEstornoDetalheResponse;
import br.com.ecad.distribuicao.application.dto.AjusteEstornoHistoricoResponse;
import br.com.ecad.distribuicao.application.dto.AjusteEstornoLinhaResponse;
import br.com.ecad.distribuicao.application.dto.ProcessoResumoLiteResponse;
import br.com.ecad.distribuicao.application.dto.RubricaResumoResponse;
import br.com.ecad.distribuicao.application.queries.BuscarAjusteEstornoPorIdQuery;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoLinhaRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BuscarAjusteEstornoPorIdQueryHandler {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AjusteEstornoRepository ajusteEstornoRepository;
    private final AjusteEstornoLinhaRepository ajusteEstornoLinhaRepository;
    private final AjusteEstornoHistoricoRepository ajusteEstornoHistoricoRepository;
    private final RubricaRepository rubricaRepository;
    private final ProcessoRepository processoRepository;
    private final ObjectMapper objectMapper;

    public BuscarAjusteEstornoPorIdQueryHandler(
            AjusteEstornoRepository ajusteEstornoRepository,
            AjusteEstornoLinhaRepository ajusteEstornoLinhaRepository,
            AjusteEstornoHistoricoRepository ajusteEstornoHistoricoRepository,
            RubricaRepository rubricaRepository,
            ProcessoRepository processoRepository,
            ObjectMapper objectMapper) {
        this.ajusteEstornoRepository = Objects.requireNonNull(
                ajusteEstornoRepository, "ajusteEstornoRepository must not be null");
        this.ajusteEstornoLinhaRepository = Objects.requireNonNull(
                ajusteEstornoLinhaRepository, "ajusteEstornoLinhaRepository must not be null");
        this.ajusteEstornoHistoricoRepository = Objects.requireNonNull(
                ajusteEstornoHistoricoRepository, "ajusteEstornoHistoricoRepository must not be null");
        this.rubricaRepository = Objects.requireNonNull(
                rubricaRepository, "rubricaRepository must not be null");
        this.processoRepository = Objects.requireNonNull(
                processoRepository, "processoRepository must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Transactional(readOnly = true)
    public AjusteEstornoDetalheResponse handle(BuscarAjusteEstornoPorIdQuery query) {
        Objects.requireNonNull(query, "query must not be null");

        AjusteEstorno ajuste = ajusteEstornoRepository.findById(query.id())
                .orElseThrow(() -> new NotFoundException("Ajuste de estorno não encontrado: " + query.id()));

        RubricaResumoResponse rubrica = rubricaRepository.findBySigla(ajuste.getRubricaSigla())
                .map(r -> new RubricaResumoResponse(r.getSigla(), r.getNome()))
                .orElse(new RubricaResumoResponse(ajuste.getRubricaSigla(), ajuste.getRubricaSigla()));

        ProcessoResumoLiteResponse processoOrigem = ajuste.getProcessoOrigemId() != null
                ? processoRepository.findById(ajuste.getProcessoOrigemId())
                        .map(this::toProcessoResumoLite)
                        .orElse(null)
                : null;

        ProcessoResumoLiteResponse processoAplicacao = ajuste.getProcessoAplicacaoId() != null
                ? processoRepository.findById(ajuste.getProcessoAplicacaoId())
                        .map(this::toProcessoResumoLite)
                        .orElse(null)
                : null;

        List<AjusteEstornoHistoricoResponse> historico = ajusteEstornoHistoricoRepository
                .findByAjusteId(ajuste.getId())
                .stream()
                .sorted((a, b) -> a.getOcorridoEm().compareTo(b.getOcorridoEm()))
                .map(h -> new AjusteEstornoHistoricoResponse(
                        h.getStatus(),
                        h.getProcessoId(),
                        h.getOcorridoEm(),
                        h.getObservacao()))
                .toList();

        List<AjusteEstornoLinhaResponse> linhas = ajusteEstornoLinhaRepository
                .findByAjusteId(ajuste.getId())
                .stream()
                .map(l -> new AjusteEstornoLinhaResponse(
                        l.getId(),
                        l.getAjusteId(),
                        l.getProcessoOrigemId(),
                        l.getProcessoAplicacaoId(),
                        l.getCreditoOrigemId(),
                        l.getTitularId(),
                        l.getTitularNome(),
                        l.getObraId(),
                        l.getObraTitulo(),
                        l.getFonogramaId(),
                        l.getCategoria(),
                        l.getSubcategoriaConexa(),
                        l.getValorCreditoOrigem(),
                        l.getValorAjuste()))
                .toList();

        Map<String, Object> payloadOriginal = parsePayload(ajuste.getPayloadOriginal());

        return new AjusteEstornoDetalheResponse(
                ajuste.getId(),
                ajuste.getEventId(),
                ajuste.getPagamentoId(),
                ajuste.getLicencaId(),
                rubrica,
                ajuste.getPeriodoOrigem(),
                ajuste.getValorEstornadoBruto(),
                ajuste.getValorAjusteLiquido(),
                ajuste.getValorAplicado(),
                ajuste.getStatus(),
                ajuste.getProcessoOrigemId(),
                ajuste.getProcessoAplicacaoId(),
                ajuste.getJustificativa(),
                ajuste.getEstornadoPor(),
                ajuste.getEstornadoEm(),
                ajuste.getRecebidoEm(),
                ajuste.getPrevistoEm(),
                ajuste.getAplicadoEm(),
                processoOrigem,
                processoAplicacao,
                historico,
                linhas,
                payloadOriginal);
    }

    private ProcessoResumoLiteResponse toProcessoResumoLite(ProcessoDistribuicao processo) {
        return new ProcessoResumoLiteResponse(
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                processo.getStatus());
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(payloadJson, MAP_TYPE);
        } catch (Exception e) {
            return Map.of("raw", payloadJson);
        }
    }
}
