package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.ResultadoReavaliacaoRetido;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusLiberacaoCredito;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.domain.interfaces.CreditoLiberacaoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRetidoReavaliacaoRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CreditoRetidoLiberacaoServiceTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID CREDITO_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");
    private static final UUID TITULAR_ID = UUID.fromString("00000000-0000-0000-0000-000000000004");
    private static final String TOKEN = "Bearer token";

    @Mock private CreditoLiberacaoRepository creditoLiberacaoRepository;
    @Mock private CreditoRetidoReavaliacaoRepository creditoRetidoReavaliacaoRepository;
    @Mock private CreditoRepository creditoRepository;
    @Mock private CadastroOwnershipClient cadastroOwnershipClient;

    private CreditoRetidoLiberacaoService service;

    @BeforeEach
    void setUp() {
        service = new CreditoRetidoLiberacaoService(
                creditoLiberacaoRepository,
                creditoRetidoReavaliacaoRepository,
                creditoRepository,
                cadastroOwnershipClient,
                new SimpleMeterRegistry());
    }

    @Test
    void preverLiberacoes_WithEligibleRetainedCredit_ShouldCreatePreview() {
        ProcessoDistribuicao processo = processoAtual();
        Credito credito = creditoRetido();
        when(creditoLiberacaoRepository.findCandidatosRetidos(PROCESSO_ID, "RADIO", "2026-04"))
                .thenReturn(List.of(credito));
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_ID), Set.of(), TOKEN))
                .thenReturn(snapshot("LIBERADA", titular("UBC")));
        when(creditoRetidoReavaliacaoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(creditoLiberacaoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var resultado = service.preverLiberacoes(processo, TOKEN);

        assertThat(resultado.total()).isEqualTo(1);
        assertThat(resultado.valorTotal()).isEqualByComparingTo("400.00");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<CreditoLiberacao>> liberacoesCaptor =
                ArgumentCaptor.forClass((Class<List<CreditoLiberacao>>) (Class<?>) List.class);
        verify(creditoLiberacaoRepository).saveAll(liberacoesCaptor.capture());
        CreditoLiberacao liberacao = liberacoesCaptor.getValue().getFirst();
        assertThat(liberacao.getCreditoRetidoId()).isEqualTo(CREDITO_ID);
        assertThat(liberacao.getProcessoLiberacaoId()).isEqualTo(PROCESSO_ID);
        assertThat(liberacao.getStatus()).isEqualTo(StatusLiberacaoCredito.PREVISTA);
        assertThat(liberacao.getValorLiberado()).isEqualByComparingTo("400.00");
        assertThat(resultado.reavaliacoes().getFirst().getResultado()).isEqualTo(ResultadoReavaliacaoRetido.ELEGIVEL);
    }

    @Test
    void preverLiberacoes_WithPendingWork_ShouldKeepRetainedWithoutPreview() {
        ProcessoDistribuicao processo = processoAtual();
        Credito credito = creditoRetido();
        when(creditoLiberacaoRepository.findCandidatosRetidos(PROCESSO_ID, "RADIO", "2026-04"))
                .thenReturn(List.of(credito));
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_ID), Set.of(), TOKEN))
                .thenReturn(snapshot("PENDENTE", titular("UBC")));
        when(creditoRetidoReavaliacaoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(creditoLiberacaoRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var resultado = service.preverLiberacoes(processo, TOKEN);

        assertThat(resultado.total()).isZero();
        assertThat(resultado.liberacoes()).isEmpty();
        assertThat(resultado.reavaliacoes().getFirst().getResultado())
                .isEqualTo(ResultadoReavaliacaoRetido.OBRA_PENDENTE);
    }

    @Test
    void efetivarLiberacoes_ShouldUpdateOriginalCreditAndReleaseStatus() {
        ProcessoDistribuicao processo = processoAtual();
        Credito credito = creditoRetido();
        CreditoLiberacao liberacao = CreditoLiberacao.prevista(
                credito,
                processo,
                Instant.parse("2026-05-17T10:00:00Z"));
        Instant liberadoEm = Instant.parse("2026-05-17T12:00:00Z");
        when(creditoLiberacaoRepository.findPrevistasByProcessoLiberacaoId(PROCESSO_ID))
                .thenReturn(List.of(liberacao));
        when(creditoRepository.findByIdForUpdate(CREDITO_ID)).thenReturn(Optional.of(credito));

        var resultado = service.efetivarLiberacoes(processo, liberadoEm);

        assertThat(resultado.total()).isEqualTo(1);
        assertThat(credito.getStatus()).isEqualTo(StatusCredito.LIBERADO);
        assertThat(credito.getProcessoLiberacaoId()).isEqualTo(PROCESSO_ID);
        assertThat(credito.getLiberadoEm()).isEqualTo(liberadoEm);
        assertThat(liberacao.getStatus()).isEqualTo(StatusLiberacaoCredito.EFETIVADA);
        assertThat(liberacao.getEfetivadoEm()).isEqualTo(liberadoEm);
        verify(creditoRepository).findByIdForUpdate(eq(CREDITO_ID));
    }

    private ProcessoDistribuicao processoAtual() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO",
                "2026-04",
                new BigDecimal("1000.00"),
                "analista",
                UUID.randomUUID(),
                UUID.randomUUID());
        setField(processo, "id", PROCESSO_ID);
        return processo;
    }

    private Credito creditoRetido() {
        Credito credito = Credito.retido(
                UUID.fromString("00000000-0000-0000-0000-000000000010"),
                TITULAR_ID,
                "Maria Compositora",
                OBRA_ID,
                "Meu Bem Querer",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("400.00"),
                new BigDecimal("400.00"),
                new BigDecimal("10.000000"),
                MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                Instant.parse("2026-05-16T10:00:00Z"),
                Instant.parse("2026-05-16T10:00:00Z"));
        setField(credito, "id", CREDITO_ID);
        return credito;
    }

    private OwnershipSnapshot snapshot(String statusObra, ParticipacaoOwnership titular) {
        return new OwnershipSnapshot(
                List.of(new ObraOwnership(OBRA_ID, "Meu Bem Querer", statusObra, List.of(titular))),
                List.of());
    }

    private ParticipacaoOwnership titular(String associacaoSigla) {
        return new ParticipacaoOwnership(
                TITULAR_ID,
                "Maria Compositora",
                associacaoSigla,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.0000"));
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Failed to set field " + fieldName, exception);
        }
    }
}
