package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.ecad.distribuicao.domain.calculo.CalculadoraCreditos;
import br.com.ecad.distribuicao.domain.calculo.CalculoCreditosInput;
import br.com.ecad.distribuicao.domain.calculo.ExecucaoRol;
import br.com.ecad.distribuicao.domain.calculo.FonogramaOwnership;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.calculo.ResultadoCalculo;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CalculadoraCreditosTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OBRA_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final UUID TITULAR_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000302");
    private static final UUID TITULAR_C_ID = UUID.fromString("00000000-0000-0000-0000-000000000303");

    private final CalculadoraCreditos calculadora = new CalculadoraCreditos();

    @Test
    void calcular_WithMultipleWeightedWorks_ShouldAllocateVerbaProportionally() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(
                        execucao(OBRA_A_ID, "Obra A", null, 10, "1.0000"),
                        execucao(OBRA_B_ID, "Obra B", null, 15, "2.0000")),
                snapshot(
                        List.of(
                                obra(OBRA_A_ID, "Obra A", autoral(TITULAR_A_ID, "Titular A", "100.0000")),
                                obra(OBRA_B_ID, "Obra B", autoral(TITULAR_B_ID, "Titular B", "100.0000"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        assertThat(resultado.creditos()).hasSize(2);
        assertThat(creditoPorObra(resultado, OBRA_A_ID).getValorCredito()).isEqualByComparingTo("250.00");
        assertThat(creditoPorObra(resultado, OBRA_B_ID).getValorCredito()).isEqualByComparingTo("750.00");
        assertThat(resultado.resumo().totalExecucoes()).isEqualTo(25);
        assertThat(resultado.resumo().totalPontos()).isEqualByComparingTo("40.000000");
        assertThat(resultado.resumo().valorTotalCalculado()).isEqualByComparingTo("1000.00");
    }

    @Test
    void calcular_WithWorkWithoutFonograma_ShouldAllocateOneHundredPercentToAutoral() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obra(OBRA_A_ID, "Obra A", autoral(TITULAR_A_ID, "Titular A", "100.0000"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        Credito credito = resultado.creditos().getFirst();
        assertThat(credito.getCategoria()).isEqualTo(CategoriaCredito.AUTORAL);
        assertThat(credito.getFonogramaId()).isNull();
        assertThat(credito.getStatus()).isEqualTo(StatusCredito.CALCULADO);
        assertThat(credito.getMotivoRetencao()).isNull();
        assertThat(credito.getRetidoEm()).isNull();
        assertThat(credito.getValorObra()).isEqualByComparingTo("1000.00");
        assertThat(credito.getValorCredito()).isEqualByComparingTo("1000.00");
    }

    @Test
    void calcular_WithWorkWithFonograma_ShouldApplyAutoralAndConexoSplit() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", FONOGRAMA_ID, 1, "1.0000")),
                snapshot(
                        List.of(obra(OBRA_A_ID, "Obra A", autoral(TITULAR_A_ID, "Autor", "100.0000"))),
                        List.of(fonograma(
                                FONOGRAMA_ID,
                                OBRA_A_ID,
                                conexo(TITULAR_B_ID, "Intérprete", SubcategoriaConexa.INTERPRETE, "100.0000")))));

        ResultadoCalculo resultado = calculadora.calcular(input);

        Credito autoral = creditoPorCategoria(resultado, CategoriaCredito.AUTORAL);
        Credito conexo = creditoPorCategoria(resultado, CategoriaCredito.CONEXO);
        assertThat(autoral.getValorObra()).isEqualByComparingTo("666.70");
        assertThat(autoral.getValorCredito()).isEqualByComparingTo("666.70");
        assertThat(conexo.getValorObra()).isEqualByComparingTo("333.30");
        assertThat(conexo.getValorCredito()).isEqualByComparingTo("333.30");
        assertThat(conexo.getSubcategoriaConexa()).isEqualTo(SubcategoriaConexa.INTERPRETE);
    }

    @Test
    void calcular_WithTwoHoldersInSameSide_ShouldAllocateByPercentual() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obra(
                                OBRA_A_ID,
                                "Obra A",
                                autoral(TITULAR_A_ID, "Titular 60", "60.0000"),
                                autoral(TITULAR_B_ID, "Titular 40", "40.0000"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        assertThat(creditoPorTitular(resultado, TITULAR_A_ID).getValorCredito()).isEqualByComparingTo("600.00");
        assertThat(creditoPorTitular(resultado, TITULAR_B_ID).getValorCredito()).isEqualByComparingTo("400.00");
    }

    @Test
    void calcular_WithThreeWayResidualCent_ShouldAssignResidualToLargestCredit() {
        CalculoCreditosInput input = input(
                "100.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obra(
                                OBRA_A_ID,
                                "Obra A",
                                autoral(TITULAR_A_ID, "Titular A", "33.3333"),
                                autoral(TITULAR_B_ID, "Titular B", "33.3333"),
                                autoral(TITULAR_C_ID, "Titular C", "33.3334"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        assertThat(creditoPorTitular(resultado, TITULAR_A_ID).getValorCredito()).isEqualByComparingTo("33.33");
        assertThat(creditoPorTitular(resultado, TITULAR_B_ID).getValorCredito()).isEqualByComparingTo("33.33");
        assertThat(creditoPorTitular(resultado, TITULAR_C_ID).getValorCredito()).isEqualByComparingTo("33.34");
        assertThat(resultado.resumo().valorTotalCalculado()).isEqualByComparingTo("100.00");
    }

    @Test
    void calcular_WithObraPendente_ShouldRetainAllCreditsForWorkWithoutChangingValues() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obraComStatus(
                                OBRA_A_ID,
                                "Obra A",
                                "PENDENTE",
                                autoral(TITULAR_A_ID, "Titular A", "60.0000"),
                                autoral(TITULAR_B_ID, "Titular B", "40.0000"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        assertThat(resultado.creditos()).hasSize(2);
        assertThat(resultado.creditos())
                .extracting(Credito::getStatus)
                .containsOnly(StatusCredito.RETIDO);
        assertThat(resultado.creditos())
                .extracting(Credito::getMotivoRetencao)
                .containsOnly(MotivoRetencao.OBRA_PENDENTE);
        assertThat(creditoPorTitular(resultado, TITULAR_A_ID).getValorCredito()).isEqualByComparingTo("600.00");
        assertThat(resultado.resumo().totalCreditosRetidos()).isEqualTo(2);
        assertThat(resultado.resumo().valorTotalRetido()).isEqualByComparingTo("1000.00");
    }

    @Test
    void calcular_WithObraBloqueadaAndHolderWithoutAssociation_ShouldUseObraBloqueadaPrecedence() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obraComStatus(
                                OBRA_A_ID,
                                "Obra A",
                                "BLOQUEADA",
                                autoralSemAssociacao(TITULAR_A_ID, "Titular A", "100.0000"))),
                        List.of()));

        Credito credito = calculadora.calcular(input).creditos().getFirst();

        assertThat(credito.getStatus()).isEqualTo(StatusCredito.RETIDO);
        assertThat(credito.getMotivoRetencao()).isEqualTo(MotivoRetencao.OBRA_BLOQUEADA);
        assertThat(credito.getRetidoEm()).isNotNull();
    }

    @Test
    void calcular_WithHolderWithoutAssociation_ShouldRetainOnlyThatHolder() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obra(
                                OBRA_A_ID,
                                "Obra A",
                                autoralSemAssociacao(TITULAR_A_ID, "Titular Sem Associação", "40.0000"),
                                autoral(TITULAR_B_ID, "Titular Associado", "60.0000"))),
                        List.of()));

        ResultadoCalculo resultado = calculadora.calcular(input);

        Credito semAssociacao = creditoPorTitular(resultado, TITULAR_A_ID);
        Credito associado = creditoPorTitular(resultado, TITULAR_B_ID);
        assertThat(semAssociacao.getStatus()).isEqualTo(StatusCredito.RETIDO);
        assertThat(semAssociacao.getMotivoRetencao()).isEqualTo(MotivoRetencao.TITULAR_SEM_ASSOCIACAO);
        assertThat(semAssociacao.getValorCredito()).isEqualByComparingTo("400.00");
        assertThat(associado.getStatus()).isEqualTo(StatusCredito.CALCULADO);
        assertThat(associado.getMotivoRetencao()).isNull();
        assertThat(resultado.resumo().totalCreditosRetidos()).isEqualTo(1);
        assertThat(resultado.resumo().valorTotalRetido()).isEqualByComparingTo("400.00");
    }

    @Test
    void calcular_WithNonDistributableWorkStatus_ShouldThrowBusinessPrecondition() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obraComStatus(
                                OBRA_A_ID,
                                "Obra A",
                                "DOMINIO_PUBLICO",
                                autoral(TITULAR_A_ID, "Titular A", "100.0000"))),
                        List.of()));

        assertThatThrownBy(() -> calculadora.calcular(input))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Obra não distribuível");
    }

    @Test
    void calcular_WithMissingAutoralOwnership_ShouldThrowBusinessPrecondition() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(List.of(), List.of()));

        assertThatThrownBy(() -> calculadora.calcular(input))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Titularidade autoral");
    }

    @Test
    void calcular_WithInvalidPercentualTotal_ShouldThrowBusinessPrecondition() {
        CalculoCreditosInput input = input(
                "1000.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                snapshot(
                        List.of(obra(
                                OBRA_A_ID,
                                "Obra A",
                                autoral(TITULAR_A_ID, "Titular A", "50.0000"),
                                autoral(TITULAR_B_ID, "Titular B", "40.0000"))),
                        List.of()));

        assertThatThrownBy(() -> calculadora.calcular(input))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Titularidade autoral inválida");
    }

    @Test
    void calcular_WithEmptyRolOrZeroVerba_ShouldThrowBusinessPrecondition() {
        OwnershipSnapshot ownershipSnapshot = snapshot(
                List.of(obra(OBRA_A_ID, "Obra A", autoral(TITULAR_A_ID, "Titular A", "100.0000"))),
                List.of());

        assertThatThrownBy(() -> calculadora.calcular(input("1000.00", List.of(), ownershipSnapshot)))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Rol de execuções");
        assertThatThrownBy(() -> calculadora.calcular(input(
                "0.00",
                List.of(execucao(OBRA_A_ID, "Obra A", null, 1, "1.0000")),
                ownershipSnapshot)))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Verba Líquida");
    }

    private CalculoCreditosInput input(String verbaLiquida, List<ExecucaoRol> execucoes, OwnershipSnapshot snapshot) {
        return new CalculoCreditosInput(PROCESSO_ID, new BigDecimal(verbaLiquida), execucoes, snapshot);
    }

    private ExecucaoRol execucao(UUID obraId, String obraTitulo, UUID fonogramaId, int quantidade, String peso) {
        return new ExecucaoRol(obraId, obraTitulo, fonogramaId, quantidade, new BigDecimal(peso));
    }

    private OwnershipSnapshot snapshot(List<ObraOwnership> obras, List<FonogramaOwnership> fonogramas) {
        return new OwnershipSnapshot(obras, fonogramas);
    }

    private ObraOwnership obra(UUID obraId, String titulo, ParticipacaoOwnership... titularidades) {
        return obraComStatus(obraId, titulo, "LIBERADA", titularidades);
    }

    private ObraOwnership obraComStatus(
            UUID obraId,
            String titulo,
            String status,
            ParticipacaoOwnership... titularidades) {
        return new ObraOwnership(obraId, titulo, status, List.of(titularidades));
    }

    private FonogramaOwnership fonograma(UUID fonogramaId, UUID obraId, ParticipacaoOwnership... participacoes) {
        return new FonogramaOwnership(fonogramaId, obraId, "LIBERADO", List.of(participacoes));
    }

    private ParticipacaoOwnership autoral(UUID titularId, String nome, String percentual) {
        return new ParticipacaoOwnership(
                titularId,
                nome,
                "UBC",
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal(percentual));
    }

    private ParticipacaoOwnership autoralSemAssociacao(UUID titularId, String nome, String percentual) {
        return new ParticipacaoOwnership(
                titularId,
                nome,
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal(percentual));
    }

    private ParticipacaoOwnership conexo(
            UUID titularId,
            String nome,
            SubcategoriaConexa subcategoria,
            String percentual) {
        return new ParticipacaoOwnership(
                titularId,
                nome,
                "UBC",
                CategoriaCredito.CONEXO,
                subcategoria,
                new BigDecimal(percentual));
    }

    private Credito creditoPorObra(ResultadoCalculo resultado, UUID obraId) {
        return resultado.creditos().stream()
                .filter(credito -> credito.getObraId().equals(obraId))
                .findFirst()
                .orElseThrow();
    }

    private Credito creditoPorCategoria(ResultadoCalculo resultado, CategoriaCredito categoria) {
        return resultado.creditos().stream()
                .filter(credito -> credito.getCategoria() == categoria)
                .findFirst()
                .orElseThrow();
    }

    private Credito creditoPorTitular(ResultadoCalculo resultado, UUID titularId) {
        return resultado.creditos().stream()
                .filter(credito -> credito.getTitularId().equals(titularId))
                .max(Comparator.comparing(Credito::getValorCredito))
                .orElseThrow();
    }
}
