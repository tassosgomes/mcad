package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Processa eventos {@code arrecadacao.pagamento.estornado} validados pelo listener,
 * persiste {@link AjusteEstorno} com idempotência e classifica em 1 de 4 ramos:
 * <ul>
 *   <li>{@code PENDENTE_APLICACAO} — processo ativo em estado CALCULADO/APROVADO/FINALIZADO</li>
 *   <li>{@code IGNORADO_SEM_DISTRIBUICAO} — nenhum processo ativo para rubrica+período</li>
 *   <li>{@code PROCESSO_CRIADO_DESATUALIZADO} — processo existe mas está em CRIADO</li>
 *   <li>desconsiderado por estado anômalo — processo em estado não esperado</li>
 * </ul>
 */
@Service
public class PagamentoEstornadoEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(PagamentoEstornadoEventHandler.class);
    private static final BigDecimal FATOR_LIQUIDO = new BigDecimal("0.85");
    private static final EnumSet<StatusProcesso> ESTADOS_ELEGÍVEIS =
            EnumSet.of(StatusProcesso.CALCULADO, StatusProcesso.APROVADO, StatusProcesso.FINALIZADO);

    private final AjusteEstornoRepository ajusteRepo;
    private final AjusteEstornoHistoricoRepository historicoRepo;
    private final ProcessoRepository processoRepo;
    private final OutboxEventWriter outboxEventWriter;
    private final Clock clock;

    public PagamentoEstornadoEventHandler(
            AjusteEstornoRepository ajusteRepo,
            AjusteEstornoHistoricoRepository historicoRepo,
            ProcessoRepository processoRepo,
            OutboxEventWriter outboxEventWriter,
            Clock clock) {
        this.ajusteRepo = ajusteRepo;
        this.historicoRepo = historicoRepo;
        this.processoRepo = processoRepo;
        this.outboxEventWriter = outboxEventWriter;
        this.clock = clock;
    }

    @Transactional
    public void handle(PagamentoEstornadoEventPayload payload, String payloadOriginal) {
        // 1. Idempotência por eventId (CloudEvent id)
        if (ajusteRepo.findByEventId(payload.eventId()).isPresent()) {
            LOGGER.info(
                    "distribuicao.ajuste_estorno.evento_recebido: eventId ja registrado, ignorando id={}",
                    payload.eventId());
            return;
        }

        // 2. Idempotência por pagamentoId (RF-05: manter primeiro, logar conflito se divergente)
        Optional<AjusteEstorno> existentePorPagamento = ajusteRepo.findByPagamentoId(payload.pagamentoId());
        if (existentePorPagamento.isPresent()) {
            AjusteEstorno existente = existentePorPagamento.get();
            if (!isPayloadEquivalente(existente, payload)) {
                LOGGER.warn(
                        "distribuicao.ajuste_estorno.conflito_pagamento: pagamentoId={} divergente, mantendo primeiro registro eventId={}",
                        payload.pagamentoId(), existente.getEventId());
            }
            return;
        }

        // 3. Calcula valor líquido = bruto * 0.85, escala 2, HALF_UP
        BigDecimal valorLiquido = payload.valorEstornadoBruto()
                .multiply(FATOR_LIQUIDO)
                .setScale(2, RoundingMode.HALF_UP);

        // 4. Busca processo ativo por rubricaSigla + periodo
        Optional<ProcessoDistribuicao> processoOpt =
                processoRepo.findAtivoByRubricaSiglaAndPeriodo(
                        payload.rubricaSigla(), payload.periodoOrigem());

        var evento = payload.toEventoEstorno();
        Instant agora = Instant.now(clock);
        AjusteEstorno ajuste;

        if (processoOpt.isEmpty()) {
            // Ramo: nenhum processo ativo para essa rubrica+período
            ajuste = AjusteEstorno.ignoradoSemDistribuicao(evento, payloadOriginal, valorLiquido);
            LOGGER.info(
                    "distribuicao.ajuste_estorno.ignorado: pagamentoId={} rubrica={} periodo={}",
                    payload.pagamentoId(), payload.rubricaSigla(), payload.periodoOrigem());
        } else {
            ProcessoDistribuicao processo = processoOpt.get();

            if (processo.getStatus() == StatusProcesso.CRIADO) {
                // Ramo: processo existe mas ainda não foi calculado — snapshot desatualizado
                ajuste = AjusteEstorno.processoCriadoDesatualizado(evento, processo, payloadOriginal, valorLiquido);
                LOGGER.warn(
                        "distribuicao.ajuste_estorno.processo_criado_desatualizado: pagamentoId={} processoId={}",
                        payload.pagamentoId(), processo.getId());
            } else if (ESTADOS_ELEGÍVEIS.contains(processo.getStatus())) {
                // Ramo: processo elegível — ajuste pendente de aplicação
                ajuste = AjusteEstorno.pendente(evento, processo, payloadOriginal, valorLiquido);
                LOGGER.info(
                        "distribuicao.ajuste_estorno.registrado: pagamentoId={} processoOrigemId={}",
                        payload.pagamentoId(), processo.getId());
            } else {
                // Estado anômalo (ex: CANCELADO) — tratar como sem distribuição
                ajuste = AjusteEstorno.ignoradoSemDistribuicao(evento, payloadOriginal, valorLiquido);
                LOGGER.warn(
                        "distribuicao.ajuste_estorno.ignorado: processo em estado inesperado {} pagamentoId={}",
                        processo.getStatus(), payload.pagamentoId());
            }
        }

        // 5. Persiste ajuste e histórico inicial
        ajuste = ajusteRepo.save(ajuste);
        historicoRepo.save(AjusteEstornoHistorico.registrar(
                ajuste.getId(),
                ajuste.getStatus(),
                ajuste.getProcessoOrigemId(),
                agora,
                "Evento registrado"));

        // 6. Publica outbox apenas para ajustes que exigem ação downstream
        if (ajuste.getStatus() == StatusAjusteEstorno.PENDENTE_APLICACAO) {
            publicarRegistrado(ajuste, agora);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private boolean isPayloadEquivalente(AjusteEstorno existente, PagamentoEstornadoEventPayload payload) {
        return existente.getValorEstornadoBruto().compareTo(payload.valorEstornadoBruto()) == 0
                && existente.getRubricaSigla().equals(payload.rubricaSigla())
                && existente.getPeriodoOrigem().equals(payload.periodoOrigem());
    }

    private void publicarRegistrado(AjusteEstorno ajuste, Instant registradoEm) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("ajusteId", ajuste.getId());
        data.put("pagamentoId", ajuste.getPagamentoId());
        data.put("licencaId", ajuste.getLicencaId());
        data.put("rubricaSigla", ajuste.getRubricaSigla());
        data.put("periodoOrigem", ajuste.getPeriodoOrigem());
        data.put("processoOrigemId", ajuste.getProcessoOrigemId());
        data.put("valorEstornadoBruto", ajuste.getValorEstornadoBruto());
        data.put("valorAjusteLiquido", ajuste.getValorAjusteLiquido());
        data.put("status", ajuste.getStatus().name());
        data.put("estornadoPor", ajuste.getEstornadoPor());
        data.put("estornadoEm", ajuste.getEstornadoEm());
        data.put("registradoEm", registradoEm);
        outboxEventWriter.addEvent(
                "distribuicao.ajuste.estorno.registrado",
                ajuste.getId().toString(),
                data);
    }
}
