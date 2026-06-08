package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import br.com.ecad.distribuicao.domain.entities.EventoEstorno;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AjusteEstornoTest {

    private static final UUID EVENT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID PAGAMENTO_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID LICENCA_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID PROCESSO_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final Instant ESTORNADO_EM = Instant.parse("2026-06-01T10:00:00Z");
    private static final Instant FIXO_EM = Instant.parse("2026-06-07T10:00:00Z");

    // -------------------------------------------------------------------------
    // Factory methods
    // -------------------------------------------------------------------------

    @Test
    void pendente_FactoryCria_ComStatusPendenteAplicacaoEProcessoOrigemPreenchido() {
        EventoEstorno evento = evento();
        ProcessoDistribuicao origem = processoCriado();

        AjusteEstorno ajuste = AjusteEstorno.pendente(evento, origem, "{}", new BigDecimal("85.00"));

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PENDENTE_APLICACAO);
        assertThat(ajuste.getProcessoOrigemId()).isEqualTo(origem.getId());
        assertThat(ajuste.getValorAjusteLiquido()).isEqualByComparingTo("85.00");
        assertThat(ajuste.getProcessoAplicacaoId()).isNull();
        assertThat(ajuste.getAplicadoEm()).isNull();
    }

    @Test
    void ignoradoSemDistribuicao_FactoryCria_ComStatusIgnoradoSemProcessoDeOrigem() {
        EventoEstorno evento = evento();

        AjusteEstorno ajuste = AjusteEstorno.ignoradoSemDistribuicao(evento, "{}", new BigDecimal("85.00"));

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.IGNORADO_SEM_DISTRIBUICAO);
        assertThat(ajuste.getProcessoOrigemId()).isNull();
        assertThat(ajuste.getProcessoAplicacaoId()).isNull();
    }

    @Test
    void processoCriadoDesatualizado_FactoryCria_ComStatusDesatualizadoReferenciandoProcessoBloqueado() {
        EventoEstorno evento = evento();
        ProcessoDistribuicao processo = processoCriado();

        AjusteEstorno ajuste = AjusteEstorno.processoCriadoDesatualizado(
                evento, processo, "{}", new BigDecimal("85.00"));

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PROCESSO_CRIADO_DESATUALIZADO);
        assertThat(ajuste.getProcessoOrigemId()).isEqualTo(processo.getId());
        assertThat(ajuste.getProcessoAplicacaoId()).isNull();
    }

    // -------------------------------------------------------------------------
    // Transições: prever
    // -------------------------------------------------------------------------

    @Test
    void prever_DeValido_DePendenteAplicacao_MudaParaPrevisto() {
        AjusteEstorno ajuste = ajustePendente();
        UUID processoAplicacaoId = UUID.randomUUID();

        ajuste.prever(processoAplicacaoId, new BigDecimal("-85.00"), FIXO_EM);

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PREVISTO);
        assertThat(ajuste.getProcessoAplicacaoId()).isEqualTo(processoAplicacaoId);
        assertThat(ajuste.getValorAplicado()).isEqualByComparingTo("-85.00");
        assertThat(ajuste.getPrevistoEm()).isEqualTo(FIXO_EM);
    }

    @Test
    void prever_EmEstadoNaoPendente_LancaIllegalStateException() {
        AjusteEstorno ajuste = ajustePendente();
        UUID processoAplicacaoId = UUID.randomUUID();
        ajuste.prever(processoAplicacaoId, new BigDecimal("-85.00"), FIXO_EM);
        // agora está PREVISTO, tenta prever de novo

        assertThatThrownBy(() -> ajuste.prever(UUID.randomUUID(), new BigDecimal("-10.00"), FIXO_EM))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PENDENTE_APLICACAO");
    }

    // -------------------------------------------------------------------------
    // Transições: aplicar
    // -------------------------------------------------------------------------

    @Test
    void aplicar_DeValido_DePrevisto_MudaParaAplicado() {
        AjusteEstorno ajuste = ajustePendente();
        ajuste.prever(UUID.randomUUID(), new BigDecimal("-85.00"), FIXO_EM);

        ajuste.aplicar(FIXO_EM.plusSeconds(60));

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.APLICADO);
        assertThat(ajuste.getAplicadoEm()).isEqualTo(FIXO_EM.plusSeconds(60));
    }

    @Test
    void aplicar_EmEstadoNaoPrevisto_LancaIllegalStateException() {
        AjusteEstorno ajuste = ajustePendente();
        // status PENDENTE_APLICACAO — não pode aplicar

        assertThatThrownBy(() -> ajuste.aplicar(FIXO_EM))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PREVISTO");
    }

    // -------------------------------------------------------------------------
    // Transições: cancelarPrevisao
    // -------------------------------------------------------------------------

    @Test
    void cancelarPrevisao_DeValido_DePrevisto_VoltaParaPendenteELimpaAmpos() {
        AjusteEstorno ajuste = ajustePendente();
        UUID processoAplicacaoId = UUID.randomUUID();
        ajuste.prever(processoAplicacaoId, new BigDecimal("-85.00"), FIXO_EM);

        ajuste.cancelarPrevisao(FIXO_EM.plusSeconds(120));

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.PENDENTE_APLICACAO);
        assertThat(ajuste.getProcessoAplicacaoId()).isNull();
        assertThat(ajuste.getValorAplicado()).isNull();
        assertThat(ajuste.getPrevistoEm()).isNull();
    }

    @Test
    void cancelarPrevisao_EmEstadoNaoPrevisto_LancaIllegalStateException() {
        AjusteEstorno ajuste = ajustePendente(); // PENDENTE_APLICACAO

        assertThatThrownBy(() -> ajuste.cancelarPrevisao(FIXO_EM))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PREVISTO");
    }

    // -------------------------------------------------------------------------
    // Transições: marcarErroIntegridade
    // -------------------------------------------------------------------------

    @Test
    void marcarErroIntegridade_ComMotivo_MudaStatusEPreencheErro() {
        AjusteEstorno ajuste = ajustePendente();

        ajuste.marcarErroIntegridade("Sem créditos válidos", FIXO_EM);

        assertThat(ajuste.getStatus()).isEqualTo(StatusAjusteEstorno.ERRO_INTEGRIDADE);
        assertThat(ajuste.getErroIntegridade()).isEqualTo("Sem créditos válidos");
    }

    // -------------------------------------------------------------------------
    // Invariantes
    // -------------------------------------------------------------------------

    @Test
    void pendente_ComValorAjusteLiquidoNegativo_LancaIllegalArgumentException() {
        assertThatThrownBy(() -> AjusteEstorno.pendente(
                evento(), processoCriado(), "{}", new BigDecimal("-1.00")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positivo");
    }

    @Test
    void pendente_ComValorAjusteLiquidoZero_LancaIllegalArgumentException() {
        assertThatThrownBy(() -> AjusteEstorno.pendente(
                evento(), processoCriado(), "{}", BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positivo");
    }

    @Test
    void ajusteEstornoLinha_ComValorAjustePositivo_LancaIllegalArgumentException() {
        assertThatThrownBy(() -> new AjusteEstornoLinha(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Titular",
                UUID.randomUUID(),
                "Obra",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("1000.00"),   // valorCreditoOrigem positivo — ok
                new BigDecimal("0.01")        // valorAjuste positivo — inválido
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("negativo");
    }

    @Test
    void ajusteEstornoLinha_ComValorCreditoOrigemNegativo_LancaIllegalArgumentException() {
        assertThatThrownBy(() -> new AjusteEstornoLinha(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Titular",
                UUID.randomUUID(),
                "Obra",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("-0.01"),   // valorCreditoOrigem negativo — inválido
                new BigDecimal("-85.00")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positivo");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private EventoEstorno evento() {
        return new EventoEstorno(
                EVENT_ID,
                PAGAMENTO_ID,
                LICENCA_ID,
                "RADIO",
                "2026-04",
                new BigDecimal("100.000000"),
                new BigDecimal("100.00"),
                "Estorno por cancelamento",
                "analista@ecad.org",
                ESTORNADO_EM);
    }

    private ProcessoDistribuicao processoCriado() {
        ProcessoDistribuicao p = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", new BigDecimal("1000.00"), "analista", null, null);
        setField(p, "id", PROCESSO_ID);
        return p;
    }

    private AjusteEstorno ajustePendente() {
        return AjusteEstorno.pendente(evento(), processoCriado(), "{}", new BigDecimal("85.00"));
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set field " + fieldName, e);
        }
    }
}
