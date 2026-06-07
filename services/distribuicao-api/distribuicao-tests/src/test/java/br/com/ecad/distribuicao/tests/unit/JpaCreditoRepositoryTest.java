package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.infra.persistence.JpaCreditoRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataCreditoRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JpaCreditoRepositoryTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TITULAR_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final Instant CRIADO_EM = Instant.parse("2026-05-07T10:15:30Z");

    @Mock
    private EntityManager entityManager;

    @Mock
    private SpringDataCreditoRepository springDataCreditoRepository;

    @Test
    void saveAll_WithAutoralCredit_ShouldPreservePercentageAndMonetaryPrecision() {
        JpaCreditoRepository repository = new JpaCreditoRepository(entityManager, springDataCreditoRepository);
        Credito credito = credito(CategoriaCredito.AUTORAL, null, null);

        List<Credito> saved = repository.saveAll(List.of(credito));

        ArgumentCaptor<Credito> captor = ArgumentCaptor.forClass(Credito.class);
        verify(entityManager).persist(captor.capture());
        assertThat(saved).containsExactly(credito);
        assertThat(captor.getValue().getPercentualAplicado()).isEqualByComparingTo("66.666667");
        assertThat(captor.getValue().getValorObra()).isEqualByComparingTo("1234.56");
        assertThat(captor.getValue().getValorCredito()).isEqualByComparingTo("823.04");
        assertThat(captor.getValue().getPontosObra()).isEqualByComparingTo("9876.543210");
        assertThat(captor.getValue().getStatus()).isEqualTo(StatusCredito.CALCULADO);
    }

    @Test
    void saveAll_WithConexoCredit_ShouldPreserveSubcategoryAndFonogramaId() {
        JpaCreditoRepository repository = new JpaCreditoRepository(entityManager, springDataCreditoRepository);
        Credito credito = credito(CategoriaCredito.CONEXO, SubcategoriaConexa.INTERPRETE, FONOGRAMA_ID);

        repository.saveAll(List.of(credito));

        ArgumentCaptor<Credito> captor = ArgumentCaptor.forClass(Credito.class);
        verify(entityManager).persist(captor.capture());
        assertThat(captor.getValue().getCategoria()).isEqualTo(CategoriaCredito.CONEXO);
        assertThat(captor.getValue().getSubcategoriaConexa()).isEqualTo(SubcategoriaConexa.INTERPRETE);
        assertThat(captor.getValue().getFonogramaId()).isEqualTo(FONOGRAMA_ID);
    }

    private Credito credito(
            CategoriaCredito categoria,
            SubcategoriaConexa subcategoriaConexa,
            UUID fonogramaId) {
        return Credito.calculado(
                PROCESSO_ID,
                TITULAR_ID,
                "Titular",
                OBRA_ID,
                "Obra",
                fonogramaId,
                categoria,
                subcategoriaConexa,
                new BigDecimal("66.666667"),
                new BigDecimal("1234.56"),
                new BigDecimal("823.04"),
                new BigDecimal("9876.543210"),
                CRIADO_EM);
    }
}
