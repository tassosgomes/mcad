package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

@Repository
@SuppressWarnings("null")
public class JpaProcessoRepository implements ProcessoRepository {

    private final SpringDataProcessoRepository springDataProcessoRepository;

    public JpaProcessoRepository(SpringDataProcessoRepository springDataProcessoRepository) {
        this.springDataProcessoRepository =
                Objects.requireNonNull(springDataProcessoRepository, "springDataProcessoRepository must not be null");
    }

    @Override
    public Optional<ProcessoDistribuicao> findById(UUID id) {
        return springDataProcessoRepository.findById(id);
    }

    @Override
    public ProcessoDistribuicao save(ProcessoDistribuicao processo) {
        return springDataProcessoRepository.save(processo);
    }

    @Override
    public boolean existsByRubricaSiglaAndPeriodoAndStatusNot(
            String rubricaSigla,
            String periodo,
            StatusProcesso status) {
        return springDataProcessoRepository
                .existsByRubricaSiglaAndPeriodoAndStatusNot(rubricaSigla, periodo, status);
    }

    @Override
    public ProcessoPage findAll(String rubricaSigla, String periodo, String status, int page, int size) {
        var spec = ProcessoSpecification.comFiltros(rubricaSigla, periodo, status);
        Page<ProcessoDistribuicao> result = springDataProcessoRepository.findAll(spec, PageRequest.of(page, size));
        return new ProcessoPage(result.getContent(), result.getTotalElements(), result.getTotalPages());
    }

    @Override
    public List<ProcessoDistribuicao> findAtivos() {
        return springDataProcessoRepository.findAll(
                ProcessoSpecification.comFiltros(null, null, null));
    }
}
