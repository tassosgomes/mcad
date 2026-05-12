package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter JPA que implementa {@link VerbaRepository} do domínio,
 * delegando ao {@link SpringDataVerbaRepository}.
 *
 * <p>Isola a camada de domínio e aplicação de tipos Spring Data,
 * seguindo o padrão Repository já adotado em {@code JpaPagamentoRepository}
 * e {@code JpaLicencaRepository}.</p>
 */
@Component
@SuppressWarnings("null")
public class JpaVerbaRepository implements VerbaRepository {

    private final SpringDataVerbaRepository springData;

    public JpaVerbaRepository(SpringDataVerbaRepository springData) {
        this.springData = springData;
    }

    @Override
    public Verba save(Verba verba) {
        return springData.save(verba);
    }

    @Override
    public Optional<Verba> findByRubricaIdAndPeriodoForUpdate(UUID rubricaId, String periodo) {
        return springData.findByRubricaIdAndPeriodoForUpdate(rubricaId, periodo);
    }

    @Override
    public Optional<Verba> findByRubricaIdAndPeriodo(UUID rubricaId, String periodo) {
        return springData.findByRubricaIdAndPeriodo(rubricaId, periodo);
    }

    @Override
    public Page<Verba> findAll(Specification<Verba> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }

    @Override
    public List<VerbaAgregadoProjection> findAgregadoPorRubrica(VerbaAgregadoFiltro filtro) {
        return springData.findAgregadoPorRubrica(
                filtro.rubricaSigla(),
                filtro.periodoInicio(),
                filtro.periodoFim()
        ).stream()
                .<VerbaAgregadoProjection>map(r -> r)
                .toList();
    }
}
