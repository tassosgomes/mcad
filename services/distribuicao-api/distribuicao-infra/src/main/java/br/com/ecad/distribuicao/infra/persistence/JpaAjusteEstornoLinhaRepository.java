package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoLinhaRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaAjusteEstornoLinhaRepository implements AjusteEstornoLinhaRepository {

    private final SpringDataAjusteEstornoLinhaRepository springDataRepository;

    public JpaAjusteEstornoLinhaRepository(
            SpringDataAjusteEstornoLinhaRepository springDataRepository) {
        this.springDataRepository =
                Objects.requireNonNull(springDataRepository, "springDataRepository must not be null");
    }

    @Override
    @Transactional
    public List<AjusteEstornoLinha> saveAll(List<AjusteEstornoLinha> linhas) {
        Objects.requireNonNull(linhas, "linhas must not be null");
        return springDataRepository.saveAll(linhas);
    }

    @Override
    public List<AjusteEstornoLinha> findByAjusteId(UUID ajusteId) {
        return springDataRepository.findByAjusteId(ajusteId);
    }

    @Override
    public List<AjusteEstornoLinha> findByProcessoAplicacaoId(UUID processoId) {
        return springDataRepository.findByProcessoAplicacaoId(processoId);
    }

    @Override
    @Transactional
    public void deleteByAjusteIdAndProcessoAplicacaoId(UUID ajusteId, UUID processoAplicacaoId) {
        springDataRepository.deleteByAjusteIdAndProcessoAplicacaoId(ajusteId, processoAplicacaoId);
    }
}
