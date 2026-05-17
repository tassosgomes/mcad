package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.GenericAuditEventFactory;
import br.com.ecad.distribuicao.application.commands.CalcularProcessoCommand;
import br.com.ecad.distribuicao.application.dto.CalcularProcessoResponse;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService.ResultadoLiberacaoRetidos;
import br.com.ecad.distribuicao.application.services.ParsedRol;
import br.com.ecad.distribuicao.application.services.RolPayloadParser;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.sdk.AuditClient;
import br.com.ecad.distribuicao.domain.calculo.CalculadoraCreditos;
import br.com.ecad.distribuicao.domain.calculo.CalculoCreditosInput;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ResultadoCalculo;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CalcularProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CalcularProcessoCommandHandler.class);
    private static final String EVENT_TYPE = "distribuicao.processo.calculado";
    private static final String CREDITO_RETIDO_EVENT_TYPE = "distribuicao.credito.retido";
    private static final String CALCULO_DURATION_METRIC = "distribuicao.calculo.duration";
    private static final String GENERATED_CREDITS_METRIC = "distribuicao.calculo.creditos.generated";
    private static final String CALCULATION_FAILURES_METRIC = "distribuicao.calculo.failures";
    private static final String RETAINED_CREDITS_METRIC = "distribuicao.retencao.creditos.generated";
    private static final String RETAINED_VALUE_METRIC = "distribuicao.retencao.valor.total";

    private static final String ENTITY_TYPE = "ProcessoDistribuicao";
    private static final String SCREEN_ID = "DISTRIBUICAO_PROCESSOS";
    private static final String SCREEN_NAME = "Processos";

    private final ProcessoRepository processoRepository;
    private final SnapshotRolRepository snapshotRolRepository;
    private final SnapshotVerbaRepository snapshotVerbaRepository;
    private final CadastroOwnershipClient cadastroOwnershipClient;
    private final CreditoRepository creditoRepository;
    private final CreditoRetidoLiberacaoService creditoRetidoLiberacaoService;
    private final OutboxEventRepository outboxEventRepository;
    private final RolPayloadParser rolPayloadParser;
    private final ObjectMapper objectMapper;
    private final CalculadoraCreditos calculadoraCreditos;
    private final MeterRegistry meterRegistry;
    private final AuditClient auditClient;
    private final GenericAuditEventFactory auditFactory;
    private final AuditContextProvider auditContextProvider;

    public CalcularProcessoCommandHandler(
            ProcessoRepository processoRepository,
            SnapshotRolRepository snapshotRolRepository,
            SnapshotVerbaRepository snapshotVerbaRepository,
            CadastroOwnershipClient cadastroOwnershipClient,
            CreditoRepository creditoRepository,
            CreditoRetidoLiberacaoService creditoRetidoLiberacaoService,
            OutboxEventRepository outboxEventRepository,
            RolPayloadParser rolPayloadParser,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            AuditClient auditClient,
            GenericAuditEventFactory auditFactory,
            AuditContextProvider auditContextProvider) {
        this.processoRepository = Objects.requireNonNull(processoRepository, "processoRepository must not be null");
        this.snapshotRolRepository = Objects.requireNonNull(snapshotRolRepository, "snapshotRolRepository must not be null");
        this.snapshotVerbaRepository = Objects.requireNonNull(snapshotVerbaRepository, "snapshotVerbaRepository must not be null");
        this.cadastroOwnershipClient = Objects.requireNonNull(cadastroOwnershipClient, "cadastroOwnershipClient must not be null");
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
        this.creditoRetidoLiberacaoService = Objects.requireNonNull(
                creditoRetidoLiberacaoService,
                "creditoRetidoLiberacaoService must not be null");
        this.outboxEventRepository = Objects.requireNonNull(outboxEventRepository, "outboxEventRepository must not be null");
        this.rolPayloadParser = Objects.requireNonNull(rolPayloadParser, "rolPayloadParser must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
        this.calculadoraCreditos = new CalculadoraCreditos();
        this.meterRegistry = Objects.requireNonNull(meterRegistry, "meterRegistry must not be null");
        this.auditClient = Objects.requireNonNull(auditClient, "auditClient must not be null");
        this.auditFactory = Objects.requireNonNull(auditFactory, "auditFactory must not be null");
        this.auditContextProvider = Objects.requireNonNull(auditContextProvider, "auditContextProvider must not be null");
    }

    @Transactional
    public CalcularProcessoResponse handle(CalcularProcessoCommand command) {
        long startedAt = System.nanoTime();
        ProcessoDistribuicao processo = null;
        ParsedRol parsedRol = null;
        try {
            processo = buscarProcesso(command.processoId());
            validarStatus(processo);

            SnapshotRol snapshotRol = buscarSnapshotRol(processo);
            SnapshotVerba snapshotVerba = buscarSnapshotVerba(processo);
            parsedRol = rolPayloadParser.parse(snapshotRol.getPayload());
            logCalculationStart(processo, parsedRol);

            OwnershipSnapshot ownershipSnapshot = cadastroOwnershipClient.buscarOwnership(
                    parsedRol.obraIds(),
                    parsedRol.fonogramaIds(),
                    command.bearerToken());

            ResultadoCalculo resultado = calculadoraCreditos.calcular(new CalculoCreditosInput(
                    processo.getId(),
                    snapshotVerba.getVerbaLiquida(),
                    parsedRol.execucoes(),
                    ownershipSnapshot));

            creditoRetidoLiberacaoService.cancelarLiberacoesPrevistas(processo.getId(), Instant.now());
            creditoRepository.deleteByProcessoId(processo.getId());
            creditoRepository.saveAll(resultado.creditos());
            ResultadoLiberacaoRetidos resultadoLiberacao =
                    creditoRetidoLiberacaoService.preverLiberacoes(processo, command.bearerToken());
            processo.marcarCalculado(
                    resultado.resumo().totalExecucoes(),
                    resultado.resumo().totalObras(),
                    resultado.resumo().totalPontos(),
                    resultado.resumo().totalCreditos(),
                    resultado.resumo().valorTotalCalculado(),
                    resultado.resumo().totalCreditosRetidos(),
                    resultado.resumo().valorTotalRetido(),
                    resultadoLiberacao.total(),
                    resultadoLiberacao.valorTotal());
            ProcessoDistribuicao processoSalvo = processoRepository.save(processo);

            outboxEventRepository.save(OutboxEvent.criar(
                    EVENT_TYPE,
                    processo.getId().toString(),
                    criarPayloadEvento(processoSalvo, resultado, resultadoLiberacao)));
            resultado.creditos().stream()
                    .filter(credito -> credito.getMotivoRetencao() != null)
                    .map(credito -> OutboxEvent.criar(
                            CREDITO_RETIDO_EVENT_TYPE,
                            credito.getId().toString(),
                            criarPayloadCreditoRetido(processoSalvo, credito)))
                    .forEach(outboxEventRepository::save);

            // Auditoria
            var auditCtx = auditContextProvider.current("system");
            var entityId = processoSalvo.getId().toString();
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("id", entityId);
            after.put("rubricaSigla", processoSalvo.getRubricaSigla());
            after.put("periodo", processoSalvo.getPeriodo());
            after.put("status", processoSalvo.getStatus().name());
            after.put("totalExecucoes", resultado.resumo().totalExecucoes());
            after.put("totalObras", resultado.resumo().totalObras());
            after.put("totalCreditos", resultado.resumo().totalCreditos());
            after.put("valorTotalCalculado", resultado.resumo().valorTotalCalculado().toPlainString());
            after.put("totalCreditosRetidos", resultado.resumo().totalCreditosRetidos());
            after.put("valorTotalRetido", resultado.resumo().valorTotalRetido().toPlainString());
            after.put("totalRetidosALiberar", resultadoLiberacao.total());
            after.put("valorTotalRetidosALiberar", resultadoLiberacao.valorTotal().toPlainString());
            auditClient.publish(auditFactory.userAction(
                    ENTITY_TYPE, entityId,
                    "CALCULAR_PROCESSO", "Calcular processo de distribuição",
                    "Processo de distribuição calculado", SCREEN_ID, SCREEN_NAME, auditCtx));
            auditClient.publish(auditFactory.dataChange(
                    ENTITY_TYPE, entityId, DataAction.UPDATE,
                    null, after,
                    "Processo de distribuição calculado", SCREEN_ID, SCREEN_NAME, auditCtx));

            recordDuration(startedAt, "success");
            recordGeneratedCredits(resultado.resumo().totalCreditos());
            recordRetainedCredits(resultado.creditos());
            logCalculationSuccess(processoSalvo, resultado, resultadoLiberacao, elapsedMs(startedAt));
            return CalcularProcessoResponse.from(processoSalvo, resultado.resumo());
        } catch (RuntimeException exception) {
            recordDuration(startedAt, "failure");
            String failureType = failureType(exception);
            recordFailure(failureType);
            logCalculationFailure(command.processoId(), processo, parsedRol, failureType, elapsedMs(startedAt), exception);
            throw exception;
        }
    }

    private ProcessoDistribuicao buscarProcesso(UUID processoId) {
        return processoRepository.findById(processoId)
                .orElseThrow(() -> new NotFoundException("Processo de distribuição não encontrado: " + processoId));
    }

    private void validarStatus(ProcessoDistribuicao processo) {
        if (processo.getStatus() != StatusProcesso.CRIADO) {
            throw new PreRequisitosException(
                    "Processo de distribuição deve estar em CRIADO para cálculo. Status atual: "
                            + processo.getStatus());
        }
    }

    private SnapshotRol buscarSnapshotRol(ProcessoDistribuicao processo) {
        if (processo.getSnapshotRolId() != null) {
            return snapshotRolRepository.findById(processo.getSnapshotRolId())
                    .orElseThrow(() -> new PreRequisitosException("Snapshot de Rol do processo não foi encontrado"));
        }
        return snapshotRolRepository.findByRubricaSiglaAndPeriodo(processo.getRubricaSigla(), processo.getPeriodo())
                .orElseThrow(() -> new PreRequisitosException("Snapshot de Rol do processo não foi encontrado"));
    }

    private SnapshotVerba buscarSnapshotVerba(ProcessoDistribuicao processo) {
        if (processo.getSnapshotVerbaId() != null) {
            return snapshotVerbaRepository.findById(processo.getSnapshotVerbaId())
                    .orElseThrow(() -> new PreRequisitosException("Snapshot de Verba do processo não foi encontrado"));
        }
        return snapshotVerbaRepository.findByRubricaSiglaAndPeriodo(processo.getRubricaSigla(), processo.getPeriodo())
                .orElseThrow(() -> new PreRequisitosException("Snapshot de Verba do processo não foi encontrado"));
    }

    private String criarPayloadEvento(
            ProcessoDistribuicao processo,
            ResultadoCalculo resultado,
            ResultadoLiberacaoRetidos resultadoLiberacao) {
        try {
            return objectMapper.writeValueAsString(new ProcessoCalculadoEventPayload(
                    processo.getId(),
                    processo.getRubricaSigla(),
                    processo.getPeriodo(),
                    processo.getStatus().name(),
                    resultado.resumo().totalExecucoes(),
                    resultado.resumo().totalObras(),
                    resultado.resumo().totalCreditos(),
                    resultado.resumo().valorTotalCalculado(),
                    resultado.resumo().totalCreditosRetidos(),
                    resultado.resumo().valorTotalRetido(),
                    resultadoLiberacao.total(),
                    resultadoLiberacao.valorTotal(),
                    processo.getCalculadoEm()));
        } catch (JsonProcessingException exception) {
            throw new PreRequisitosException("Falha ao montar evento de cálculo do processo");
        }
    }

    private String criarPayloadCreditoRetido(ProcessoDistribuicao processo, Credito credito) {
        try {
            return objectMapper.writeValueAsString(new CreditoRetidoEventPayload(
                    credito.getId(),
                    processo.getId(),
                    processo.getRubricaSigla(),
                    processo.getPeriodo(),
                    credito.getTitularId(),
                    credito.getTitularNome(),
                    credito.getObraId(),
                    credito.getObraTitulo(),
                    credito.getFonogramaId(),
                    credito.getCategoria().name(),
                    credito.getSubcategoriaConexa() == null ? null : credito.getSubcategoriaConexa().name(),
                    credito.getValorCredito(),
                    credito.getMotivoRetencao().name(),
                    credito.getRetidoEm()));
        } catch (JsonProcessingException exception) {
            throw new PreRequisitosException("Falha ao montar evento de crédito retido");
        }
    }

    private void logCalculationStart(ProcessoDistribuicao processo, ParsedRol parsedRol) {
        LOGGER.info(
                "distribuicao.calculo.started processoId={} rubricaSigla={} periodo={} totalExecucoes={} totalObras={}",
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                totalExecucoes(parsedRol),
                parsedRol.obraIds().size());
    }

    private void logCalculationSuccess(
            ProcessoDistribuicao processo,
            ResultadoCalculo resultado,
            ResultadoLiberacaoRetidos resultadoLiberacao,
            long durationMs) {
        LOGGER.info(
                "distribuicao.calculo.succeeded processoId={} rubricaSigla={} periodo={} totalExecucoes={} totalObras={} totalCreditos={} valorTotalCalculado={} totalCreditosRetidos={} valorTotalRetido={} totalCreditosRetidosLiberados={} valorTotalRetidosLiberados={} durationMs={}",
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                resultado.resumo().totalExecucoes(),
                resultado.resumo().totalObras(),
                resultado.resumo().totalCreditos(),
                resultado.resumo().valorTotalCalculado(),
                resultado.resumo().totalCreditosRetidos(),
                resultado.resumo().valorTotalRetido(),
                resultadoLiberacao.total(),
                resultadoLiberacao.valorTotal(),
                durationMs);
    }

    private void logCalculationFailure(
            UUID commandProcessoId,
            ProcessoDistribuicao processo,
            ParsedRol parsedRol,
            String failureType,
            long durationMs,
            RuntimeException exception) {
        LOGGER.warn(
                "distribuicao.calculo.failed processoId={} rubricaSigla={} periodo={} totalExecucoes={} totalObras={} totalCreditos={} valorTotalCalculado={} durationMs={} failureType={} exceptionClass={}",
                processo != null ? processo.getId() : commandProcessoId,
                processo != null ? processo.getRubricaSigla() : null,
                processo != null ? processo.getPeriodo() : null,
                parsedRol != null ? totalExecucoes(parsedRol) : 0,
                parsedRol != null ? parsedRol.obraIds().size() : 0,
                0,
                java.math.BigDecimal.ZERO,
                durationMs,
                failureType,
                exception.getClass().getSimpleName());
    }

    private void recordDuration(long startedAt, String outcome) {
        Timer.builder(CALCULO_DURATION_METRIC)
                .tag("outcome", outcome)
                .register(meterRegistry)
                .record(System.nanoTime() - startedAt, TimeUnit.NANOSECONDS);
    }

    private void recordGeneratedCredits(int totalCreditos) {
        Counter.builder(GENERATED_CREDITS_METRIC)
                .register(meterRegistry)
                .increment(totalCreditos);
    }

    private void recordRetainedCredits(java.util.List<Credito> creditos) {
        creditos.stream()
                .filter(credito -> credito.getMotivoRetencao() != null)
                .forEach(credito -> {
                    String motivo = credito.getMotivoRetencao().name();
                    Counter.builder(RETAINED_CREDITS_METRIC)
                            .tag("motivo", motivo)
                            .register(meterRegistry)
                            .increment();
                    DistributionSummary.builder(RETAINED_VALUE_METRIC)
                            .tag("motivo", motivo)
                            .register(meterRegistry)
                            .record(credito.getValorCredito().doubleValue());
                });
    }

    private void recordFailure(String failureType) {
        Counter.builder(CALCULATION_FAILURES_METRIC)
                .tag("type", failureType)
                .register(meterRegistry)
                .increment();
    }

    private String failureType(RuntimeException exception) {
        if (exception instanceof PreRequisitosException || exception instanceof NotFoundException) {
            return "business-failure";
        }
        if (exception instanceof br.com.ecad.distribuicao.domain.exceptions.CadastroIntegrationException) {
            return "integration-failure";
        }
        return "unexpected-failure";
    }

    private int totalExecucoes(ParsedRol parsedRol) {
        return parsedRol.execucoes().stream()
                .mapToInt(br.com.ecad.distribuicao.domain.calculo.ExecucaoRol::quantidadeExecucoes)
                .sum();
    }

    private long elapsedMs(long startedAt) {
        return java.time.Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }

    private record ProcessoCalculadoEventPayload(
            UUID processoId,
            String rubricaSigla,
            String periodo,
            String status,
            int totalExecucoes,
            int totalObras,
            int totalCreditos,
            java.math.BigDecimal valorTotalCalculado,
            int totalCreditosRetidos,
            java.math.BigDecimal valorTotalRetido,
            int totalCreditosRetidosLiberados,
            java.math.BigDecimal valorTotalRetidosLiberados,
            java.time.Instant calculadoEm) {
    }

    private record CreditoRetidoEventPayload(
            UUID creditoId,
            UUID processoId,
            String rubricaSigla,
            String periodo,
            UUID titularId,
            String titularNome,
            UUID obraId,
            String obraTitulo,
            UUID fonogramaId,
            String categoria,
            String subcategoriaConexa,
            java.math.BigDecimal valorCredito,
            String motivoRetencao,
            java.time.Instant retidoEm) {
    }
}
