package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.services.AjusteEstornoAplicacaoService;
import br.com.ecad.distribuicao.application.services.ResultadoAjustesEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.EventoEstorno;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoLinhaRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AjusteEstornoAplicacaoServiceTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID PROCESSO_ORIGEM_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final Instant PREVISTO_EM = Instant.parse("2026-06-07T10:00:00Z");

    @Mock private AjusteEstornoRepository ajusteRepo;
    @Mock private AjusteEstornoLinhaRepository linhaRepo;
    @Mock private AjusteEstornoHistoricoRepository historicoRepo;
    @Mock private CreditoRepository creditoRepo;
    @Mock private ProcessoRepository processoRepo;
    @Mock private OutboxEventWriter outboxEventWriter;

    private AjusteEstornoAplicacaoService service;

    @BeforeEach
    void setUp() {
        service = new AjusteEstornoAplicacaoService(
                ajusteRepo, linhaRepo, historicoRepo, creditoRepo, processoRepo, outboxEventWriter);
        org.mockito.Mockito.lenient().when(ajusteRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(historicoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(linhaRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // -------------------------------------------------------------------------
    // validarCalculoPermitido
    // -------------------------------------------------------------------------

    @Test
    void validarCalculoPermitido_QuandoExisteBloqueioCriadoDesatualizado_LancaPreRequisitosException() {
        ProcessoDistribuicao processo = processoCriado(PROCESSO_ID, "RADIO", "2026-05");
        when(ajusteRepo.existsBloqueioSnapshotDesatualizado(PROCESSO_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.validarCalculoPermitido(processo))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("PROCESSO_CRIADO_DESATUALIZADO");
    }

    @Test
    void validarCalculoPermitido_SemBloqueio_NaoLancaException() {
        ProcessoDistribuicao processo = processoCriado(PROCESSO_ID, "RADIO", "2026-05");
        when(ajusteRepo.existsBloqueioSnapshotDesatualizado(PROCESSO_ID)).thenReturn(false);

        // deve completar sem exceção
        service.validarCalculoPermitido(processo);
    }

    // -------------------------------------------------------------------------
    // preverAjustes — sem pendentes
    // -------------------------------------------------------------------------

    @Test
    void preverAjustes_SemPendentes_RetornaEmpty() {
        ProcessoDistribuicao processo = processoCriado(PROCESSO_ID, "RADIO", "2026-05");
        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-05")).thenReturn(List.of());

        ResultadoAjustesEstorno resultado = service.preverAjustes(processo, PREVISTO_EM);

        assertThat(resultado.total()).isZero();
        assertThat(resultado.valorTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(linhaRepo, never()).saveAll(any());
    }

    // -------------------------------------------------------------------------
    // preverAjustes — elegibilidade
    // -------------------------------------------------------------------------

    @Test
    void preverAjustes_PendenteElegivel_OrigemFINALIZADO_PeriodoPosterior_MarcaPrevisto() {
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-06");
        ProcessoDistribuicao origemFinalizado = processoFinalizado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");
        AjusteEstorno ajuste = ajustePendente(PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("85.00"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-06"))
                .thenReturn(List.of(ajuste));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origemFinalizado));
        when(creditoRepo.findByProcessoIdForAjuste(PROCESSO_ORIGEM_ID))
                .thenReturn(List.of(
                        credito(PROCESSO_ORIGEM_ID, new BigDecimal("1000.00"))));

        ResultadoAjustesEstorno resultado = service.preverAjustes(processoAplicacao, PREVISTO_EM);

        assertThat(resultado.total()).isEqualTo(1);
        assertThat(resultado.valorTotal()).isEqualByComparingTo("-85.00");
        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PREVISTO);
        assertThat(ajuste.getProcessoAplicacaoId()).isEqualTo(PROCESSO_ID);
    }

    @Test
    void preverAjustes_OrigemFINALIZADO_PeriodoIgual_NaoElegivel() {
        // origem "2026-05", aplicacao "2026-05" — mesmo período, não elegível para FINALIZADO
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-05");
        ProcessoDistribuicao origemFinalizado = processoFinalizado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");
        AjusteEstorno ajuste = ajustePendente(PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("85.00"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-05"))
                .thenReturn(List.of(ajuste));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origemFinalizado));

        ResultadoAjustesEstorno resultado = service.preverAjustes(processoAplicacao, PREVISTO_EM);

        assertThat(resultado.total()).isZero();
    }

    @Test
    void preverAjustes_OrigemCANCELADO_MesmoPeriodo_Elegivel() {
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-05");
        ProcessoDistribuicao origemCancelado = processoCancelado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");
        AjusteEstorno ajuste = ajustePendente(PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("85.00"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-05"))
                .thenReturn(List.of(ajuste));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origemCancelado));
        when(creditoRepo.findByProcessoIdForAjuste(PROCESSO_ORIGEM_ID))
                .thenReturn(List.of(credito(PROCESSO_ORIGEM_ID, new BigDecimal("1000.00"))));

        ResultadoAjustesEstorno resultado = service.preverAjustes(processoAplicacao, PREVISTO_EM);

        assertThat(resultado.total()).isEqualTo(1);
    }

    // -------------------------------------------------------------------------
    // preverAjustes — algoritmo de alocação
    // -------------------------------------------------------------------------

    @Test
    void preverAjustes_Alocacao600e400_Ajuste85_LinhasSomam_Neg51_Neg34() {
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-06");
        ProcessoDistribuicao origem = processoFinalizado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");
        AjusteEstorno ajuste = ajustePendente(PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("85.00"));

        UUID creditoAId = UUID.fromString("cc000000-0000-0000-0000-000000000001");
        UUID creditoBId = UUID.fromString("cc000000-0000-0000-0000-000000000002");
        Credito cA = creditoComId(creditoAId, PROCESSO_ORIGEM_ID, new BigDecimal("600.00"),
                Instant.parse("2026-05-01T00:00:00Z"));
        Credito cB = creditoComId(creditoBId, PROCESSO_ORIGEM_ID, new BigDecimal("400.00"),
                Instant.parse("2026-05-01T00:00:01Z"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-06"))
                .thenReturn(List.of(ajuste));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origem));
        when(creditoRepo.findByProcessoIdForAjuste(PROCESSO_ORIGEM_ID)).thenReturn(List.of(cA, cB));

        ResultadoAjustesEstorno resultado = service.preverAjustes(processoAplicacao, PREVISTO_EM);

        assertThat(resultado.total()).isEqualTo(1);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AjusteEstornoLinha>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(linhaRepo).saveAll(captor.capture());

        List<AjusteEstornoLinha> linhas = captor.getValue();
        assertThat(linhas).hasSize(2);

        BigDecimal somaAjuste = linhas.stream()
                .map(AjusteEstornoLinha::getValorAjuste)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(somaAjuste).isEqualByComparingTo("-85.00");

        // Crédito A (600) -> -51.00, Crédito B (400) -> -34.00
        AjusteEstornoLinha linhaA = linhas.stream()
                .filter(l -> l.getCreditoOrigemId().equals(creditoAId))
                .findFirst().orElseThrow();
        AjusteEstornoLinha linhaB = linhas.stream()
                .filter(l -> l.getCreditoOrigemId().equals(creditoBId))
                .findFirst().orElseThrow();
        assertThat(linhaA.getValorAjuste()).isEqualByComparingTo("-51.00");
        assertThat(linhaB.getValorAjuste()).isEqualByComparingTo("-34.00");
    }

    @Test
    void preverAjustes_TresCreditosIguais333_33_Ajuste10_SomaFecha10() {
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-06");
        ProcessoDistribuicao origem = processoFinalizado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");
        AjusteEstorno ajuste = ajustePendente(PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("10.00"));

        UUID cId1 = UUID.fromString("cc000000-0000-0000-0000-000000000001");
        UUID cId2 = UUID.fromString("cc000000-0000-0000-0000-000000000002");
        UUID cId3 = UUID.fromString("cc000000-0000-0000-0000-000000000003");
        Credito c1 = creditoComId(cId1, PROCESSO_ORIGEM_ID, new BigDecimal("333.33"),
                Instant.parse("2026-05-01T00:00:00Z"));
        Credito c2 = creditoComId(cId2, PROCESSO_ORIGEM_ID, new BigDecimal("333.33"),
                Instant.parse("2026-05-01T00:00:01Z"));
        Credito c3 = creditoComId(cId3, PROCESSO_ORIGEM_ID, new BigDecimal("333.33"),
                Instant.parse("2026-05-01T00:00:02Z"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-06"))
                .thenReturn(List.of(ajuste));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origem));
        when(creditoRepo.findByProcessoIdForAjuste(PROCESSO_ORIGEM_ID)).thenReturn(List.of(c1, c2, c3));

        service.preverAjustes(processoAplicacao, PREVISTO_EM);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AjusteEstornoLinha>> captor = ArgumentCaptor.forClass(List.class);
        verify(linhaRepo).saveAll(captor.capture());
        List<AjusteEstornoLinha> linhas = captor.getValue();

        BigDecimal soma = linhas.stream()
                .map(AjusteEstornoLinha::getValorAjuste)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(soma).isEqualByComparingTo("-10.00");

        // Deve ter exatamente um -3.34 e dois -3.33 (maior resto distribuído ao primeiro)
        long count334 = linhas.stream()
                .filter(l -> l.getValorAjuste().compareTo(new BigDecimal("-3.34")) == 0)
                .count();
        long count333 = linhas.stream()
                .filter(l -> l.getValorAjuste().compareTo(new BigDecimal("-3.33")) == 0)
                .count();
        assertThat(count334).isEqualTo(1);
        assertThat(count333).isEqualTo(2);
    }

    @Test
    void preverAjustes_OrigemSemCreditos_MarcaErroIntegridade_DemaisProcessadosNormalmente() {
        ProcessoDistribuicao processoAplicacao = processoCriado(PROCESSO_ID, "RADIO", "2026-06");
        ProcessoDistribuicao origemSemCreditos = processoFinalizado(PROCESSO_ORIGEM_ID, "RADIO", "2026-05");

        UUID origemComCreditoId = UUID.fromString("00000000-0000-0000-0000-000000000099");
        ProcessoDistribuicao origemComCredito = processoFinalizado(origemComCreditoId, "RADIO", "2026-05");
        AjusteEstorno ajusteSemCredito = ajustePendente(
                PROCESSO_ORIGEM_ID, "RADIO", "2026-05", new BigDecimal("85.00"));
        AjusteEstorno ajusteComCredito = ajustePendente(
                origemComCreditoId, "RADIO", "2026-05", new BigDecimal("50.00"));

        when(ajusteRepo.findPendentesElegiveisForUpdate("RADIO", "2026-06"))
                .thenReturn(List.of(ajusteSemCredito, ajusteComCredito));
        when(processoRepo.findById(PROCESSO_ORIGEM_ID)).thenReturn(Optional.of(origemSemCreditos));
        when(processoRepo.findById(origemComCreditoId)).thenReturn(Optional.of(origemComCredito));
        when(creditoRepo.findByProcessoIdForAjuste(PROCESSO_ORIGEM_ID)).thenReturn(List.of());
        when(creditoRepo.findByProcessoIdForAjuste(origemComCreditoId))
                .thenReturn(List.of(credito(origemComCreditoId, new BigDecimal("1000.00"))));

        ResultadoAjustesEstorno resultado = service.preverAjustes(processoAplicacao, PREVISTO_EM);

        // 1 processado, 1 com erro
        assertThat(resultado.total()).isEqualTo(1);
        assertThat(ajusteSemCredito.getStatus()).isEqualTo(StatusAjusteEstorno.ERRO_INTEGRIDADE);
        assertThat(ajusteComCredito.getStatus()).isEqualTo(StatusAjusteEstorno.PREVISTO);
    }

    // -------------------------------------------------------------------------
    // efetivarAjustes
    // -------------------------------------------------------------------------

    @Test
    void efetivarAjustes_SemPrevistos_RetornaEmpty() {
        ProcessoDistribuicao processo = processoFinalizado(PROCESSO_ID, "RADIO", "2026-06");
        when(ajusteRepo.findPrevistosByProcessoAplicacaoId(PROCESSO_ID)).thenReturn(List.of());

        ResultadoAjustesEstorno resultado = service.efetivarAjustes(processo, PREVISTO_EM);

        assertThat(resultado.total()).isZero();
    }

    @Test
    void efetivarAjustes_ComDoisPrevistos_AmbosFicamAplicado_DoisEventosOutbox() {
        ProcessoDistribuicao processo = processoFinalizado(PROCESSO_ID, "RADIO", "2026-06");

        AjusteEstorno ajuste1 = ajustePrevisto(UUID.fromString("aa000000-0000-0000-0000-000000000001"),
                PROCESSO_ORIGEM_ID, PROCESSO_ID, new BigDecimal("85.00"));
        AjusteEstorno ajuste2 = ajustePrevisto(UUID.fromString("aa000000-0000-0000-0000-000000000002"),
                PROCESSO_ORIGEM_ID, PROCESSO_ID, new BigDecimal("50.00"));

        when(ajusteRepo.findPrevistosByProcessoAplicacaoId(PROCESSO_ID))
                .thenReturn(List.of(ajuste1, ajuste2));
        when(linhaRepo.findByProcessoAplicacaoId(PROCESSO_ID)).thenReturn(List.of());

        ResultadoAjustesEstorno resultado = service.efetivarAjustes(processo, PREVISTO_EM);

        assertThat(resultado.total()).isEqualTo(2);
        assertThat(ajuste1.getStatus()).isEqualTo(StatusAjusteEstorno.APLICADO);
        assertThat(ajuste2.getStatus()).isEqualTo(StatusAjusteEstorno.APLICADO);
        verify(outboxEventWriter, org.mockito.Mockito.times(2)).addEvent(
                argThat(type -> type.equals("distribuicao.ajuste.estorno.aplicado")),
                any(), any());
    }

    // -------------------------------------------------------------------------
    // cancelarPrevisoes
    // -------------------------------------------------------------------------

    @Test
    void cancelarPrevisoes_ComPrevisto_DevolveParaPendenteApagaLinhasSalvaHistorico() {
        AjusteEstorno ajuste = ajustePrevisto(
                UUID.fromString("aa000000-0000-0000-0000-000000000001"),
                PROCESSO_ORIGEM_ID, PROCESSO_ID, new BigDecimal("85.00"));

        when(ajusteRepo.findPrevistosByProcessoAplicacaoId(PROCESSO_ID)).thenReturn(List.of(ajuste));

        ResultadoAjustesEstorno resultado = service.cancelarPrevisoes(PROCESSO_ID, PREVISTO_EM);

        assertThat(resultado.total()).isEqualTo(1);
        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PENDENTE_APLICACAO);
        assertThat(ajuste.getProcessoAplicacaoId()).isNull();
        assertThat(ajuste.getValorAplicado()).isNull();
        verify(linhaRepo).deleteByAjusteIdAndProcessoAplicacaoId(any(), eq(PROCESSO_ID));
        verify(historicoRepo).save(argThat(h -> h.getStatus() == StatusAjusteEstorno.CANCELADO));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ProcessoDistribuicao processoCriado(UUID id, String rubrica, String periodo) {
        ProcessoDistribuicao p = ProcessoDistribuicao.criar(
                rubrica, periodo, new BigDecimal("1000.00"), "analista", null, null);
        setField(p, "id", id);
        return p;
    }

    private ProcessoDistribuicao processoFinalizado(UUID id, String rubrica, String periodo) {
        ProcessoDistribuicao p = processoCriado(id, rubrica, periodo);
        p.marcarCalculado(10);
        p.aprovar();
        p.finalizar();
        return p;
    }

    private ProcessoDistribuicao processoCancelado(UUID id, String rubrica, String periodo) {
        ProcessoDistribuicao p = processoCriado(id, rubrica, periodo);
        p.cancelar("Cancelado para teste com justificativa longa o suficiente");
        return p;
    }

    private AjusteEstorno ajustePendente(UUID processoOrigemId, String rubrica, String periodoOrigem,
            BigDecimal valor) {
        EventoEstorno evento = new EventoEstorno(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                rubrica, periodoOrigem,
                new BigDecimal("10.000000"), valor,
                "justificativa", "analista@ecad.org",
                Instant.parse("2026-06-01T10:00:00Z"));
        ProcessoDistribuicao origem = processoCriado(processoOrigemId, rubrica, periodoOrigem);
        return AjusteEstorno.pendente(evento, origem, "{}", valor);
    }

    private AjusteEstorno ajustePrevisto(UUID ajusteId, UUID processoOrigemId, UUID processoAplicacaoId,
            BigDecimal valorLiquido) {
        AjusteEstorno ajuste = ajustePendente(processoOrigemId, "RADIO", "2026-05", valorLiquido);
        ajuste.prever(processoAplicacaoId, valorLiquido.negate(), PREVISTO_EM);
        return ajuste;
    }

    private Credito credito(UUID processoId, BigDecimal valorCredito) {
        return creditoComId(UUID.randomUUID(), processoId, valorCredito,
                Instant.parse("2026-05-01T00:00:00Z"));
    }

    private Credito creditoComId(UUID id, UUID processoId, BigDecimal valorCredito, Instant criadoEm) {
        Credito c = Credito.calculado(
                processoId,
                UUID.randomUUID(),
                "Titular",
                UUID.randomUUID(),
                "Obra",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                valorCredito,
                valorCredito,
                new BigDecimal("10.000000"),
                criadoEm);
        setField(c, "id", id);
        return c;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Class<?> cls = target.getClass();
            Field field = null;
            while (cls != null) {
                try {
                    field = cls.getDeclaredField(fieldName);
                    break;
                } catch (NoSuchFieldException e) {
                    cls = cls.getSuperclass();
                }
            }
            if (field == null) throw new NoSuchFieldException(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set field " + fieldName, e);
        }
    }
}
