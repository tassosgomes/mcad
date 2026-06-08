package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaAjusteEstornoHistoricoRepository implements AjusteEstornoHistoricoRepository {

    private final SpringDataAjusteEstornoHistoricoRepository springDataRepository;

    public JpaAjusteEstornoHistoricoRepository(
            SpringDataAjusteEstornoHistoricoRepository springDataRepository) {
        this.springDataRepository =
                Objects.requireNonNull(springDataRepository, "springDataRepository must not be null");
    }

    @Override
    @Transactional
    public AjusteEstornoHistorico save(AjusteEstornoHistorico historico) {
        return springDataRepository.save(historico);
    }

    @Override
    public List<AjusteEstornoHistorico> findByAjusteId(UUID ajusteId) {
        return springDataRepository.findByAjusteIdOrderByOcorridoEmAsc(ajusteId);
    }
}
