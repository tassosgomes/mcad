package br.com.ecad.arrecadacao.infra.services;

import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementação real de {@link VerbaService} (F05).
 *
 * <p>Gerencia o ciclo de vida da verba por rubrica×período:
 * validação de lock de distribuição, recálculo incremental (upsert)
 * e publicação do evento {@code arrecadacao.verba.disponivel} via Outbox Pattern.</p>
 *
 * <p>Todos os métodos públicos são {@code @Transactional} para garantir que
 * o lock pessimista, o upsert e o evento outbox sejam atomicamente confirmados.</p>
 */
@Component
public class VerbaServiceImpl implements VerbaService {

    private static final Logger LOGGER = LoggerFactory.getLogger(VerbaServiceImpl.class);

    private static final String EVENT_TYPE_VERBA_DISPONIVEL = "arrecadacao.verba.disponivel";

    private final VerbaRepository verbaRepository;
    private final PagamentoRepository pagamentoRepository;
    private final RubricaRepository rubricaRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final MeterRegistry meterRegistry;

    public VerbaServiceImpl(VerbaRepository verbaRepository,
                            PagamentoRepository pagamentoRepository,
                            RubricaRepository rubricaRepository,
                            OutboxEventWriter outboxEventWriter,
                            MeterRegistry meterRegistry) {
        this.verbaRepository = verbaRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.rubricaRepository = rubricaRepository;
        this.outboxEventWriter = outboxEventWriter;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Verifica se a verba da rubrica+período está bloqueada para alteração.
     *
     * <p>Se a verba não existe, retorna sem erro (primeiro pagamento da chave — RF-06).
     * Se existe e o status não é ABERTA, lança {@link VerbaEmDistribuicaoException} (RF-15).</p>
     *
     * @param rubricaId UUID da rubrica
     * @param periodo   período no formato YYYY-MM
     * @throws VerbaEmDistribuicaoException quando status != ABERTA
     */
    @Override
    @Transactional
    public void validarLockParaAlteracao(UUID rubricaId, String periodo) {
        Optional<Verba> verbaOpt = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodo);

        if (verbaOpt.isEmpty()) {
            // Primeiro pagamento da chave — sem verba ainda, ok
            return;
        }

        Verba verba = verbaOpt.get();
        if (verba.getStatus() != StatusVerba.ABERTA) {
            Rubrica rubrica = rubricaRepository.findById(rubricaId)
                    .orElseThrow(() -> new IllegalStateException(
                            "Rubrica nao encontrada para validar lock: " + rubricaId));

            String mensagem = "Verba da rubrica %s periodo %s esta %s e nao pode ser alterada"
                    .formatted(rubrica.getSigla(), periodo, verba.getStatus());

            LOGGER.warn("Lock bloqueou alteracao. rubricaId={} periodo={} status={}",
                    rubricaId, periodo, verba.getStatus());

            Counter.builder("arrecadacao.verba.recalculo")
                    .tag("rubrica", rubrica.getSigla())
                    .tag("resultado", "locked")
                    .register(meterRegistry)
                    .increment();

            throw new VerbaEmDistribuicaoException(mensagem);
        }
    }

    /**
     * Recalcula a verba da rubrica+período e publica o evento {@code arrecadacao.verba.disponivel}.
     *
     * <p>Fluxo:
     * <ol>
     *   <li>Adquire lock pessimista (FOR UPDATE) na verba da rubrica+período.</li>
     *   <li>Se não existe, cria com {@code Verba.abrir} (RF-06).</li>
     *   <li>Soma pagamentos CONFIRMADOS via {@code PagamentoRepository.sumAndCountConfirmados}.</li>
     *   <li>Invoca {@code verba.recalcular(bruto, qtd)} — lança {@link VerbaEmDistribuicaoException}
     *       se status != ABERTA (defesa em profundidade, RF-15).</li>
     *   <li>Persiste a verba.</li>
     *   <li>Publica evento Outbox com todos os campos de RF-09.</li>
     * </ol>
     * O evento é publicado mesmo quando a verba é zerada (estorno total — RF-10).</p>
     *
     * @param rubricaId UUID da rubrica
     * @param periodo   período no formato YYYY-MM
     * @throws VerbaEmDistribuicaoException propagada de {@code Verba.recalcular} se status != ABERTA
     */
    @Override
    @Transactional
    public void recalcularVerba(UUID rubricaId, String periodo) {
        LOGGER.debug("Recalculando verba. rubricaId={} periodo={}", rubricaId, periodo);

        // 1. Adquirir lock pessimista (FOR UPDATE) — cria nova instância se não existe
        Optional<Verba> verbaExistente = verbaRepository.findByRubricaIdAndPeriodoForUpdate(rubricaId, periodo);
        boolean criada = verbaExistente.isEmpty();
        Verba verba = verbaExistente.orElseGet(() -> Verba.abrir(rubricaId, periodo));

        // 2. Buscar agregado de pagamentos CONFIRMADOS
        PagamentoAgregado agregado = pagamentoRepository.sumAndCountConfirmados(rubricaId, periodo);

        // 3. Recalcular — domain method lança VerbaEmDistribuicaoException se status != ABERTA
        verba.recalcular(agregado.totalBruto(), (int) agregado.quantidade());

        // 4. Persistir
        verba = verbaRepository.save(verba);

        // 5. Buscar rubrica para subject e payload do evento
        Rubrica rubrica = rubricaRepository.findById(rubricaId)
                .orElseThrow(() -> new IllegalStateException(
                        "Rubrica nao encontrada ao recalcular verba: " + rubricaId));

        LOGGER.info("Verba recalculada. rubricaId={} periodo={} bruto={} liquida={} qtdPagamentos={} acao={}",
                rubricaId, periodo,
                verba.getValorBrutoTotal(),
                verba.getVerbaLiquida(),
                verba.getQuantidadePagamentos(),
                criada ? "criar" : "atualizar");

        // 6. Publicar evento Outbox (RF-09, RF-10 — sempre publicar, mesmo com zeros)
        String subject = "%s:%s".formatted(rubrica.getSigla(), periodo);
        outboxEventWriter.addEvent(EVENT_TYPE_VERBA_DISPONIVEL, subject, buildEventPayload(verba, rubrica));

        // 7. Métricas
        Counter.builder("arrecadacao.verba.recalculo")
                .tag("rubrica", rubrica.getSigla())
                .tag("resultado", "ok")
                .register(meterRegistry)
                .increment();

        Counter.builder("arrecadacao.verba.evento.publicado")
                .tag("type", EVENT_TYPE_VERBA_DISPONIVEL)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Constrói o payload do evento {@code arrecadacao.verba.disponivel} conforme RF-09.
     * Valores monetários em {@code toPlainString()} para evitar notação científica.
     */
    private Map<String, Object> buildEventPayload(Verba verba, Rubrica rubrica) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("rubricaSigla", rubrica.getSigla());
        payload.put("rubricaNome", rubrica.getNome());
        payload.put("periodo", verba.getPeriodo());
        payload.put("valorBrutoTotal", verba.getValorBrutoTotal().toPlainString());
        payload.put("deducaoEcad", verba.getDeducaoEcad().toPlainString());
        payload.put("deducaoAssociacoes", verba.getDeducaoAssociacoes().toPlainString());
        payload.put("verbaLiquida", verba.getVerbaLiquida().toPlainString());
        payload.put("quantidadePagamentos", verba.getQuantidadePagamentos());
        payload.put("status", verba.getStatus().name());
        return payload;
    }
}
