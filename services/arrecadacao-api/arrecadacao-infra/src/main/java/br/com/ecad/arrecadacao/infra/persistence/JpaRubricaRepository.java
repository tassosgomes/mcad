package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class JpaRubricaRepository implements br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository {

    private final SpringDataRubricaRepository springDataRubricaRepository;

    public JpaRubricaRepository(SpringDataRubricaRepository springDataRubricaRepository) {
        this.springDataRubricaRepository = springDataRubricaRepository;
    }

    @Override
    public List<Rubrica> findAll() {
        return springDataRubricaRepository.findAll();
    }

    @Override
    public Optional<Rubrica> findBySigla(String sigla) {
        return springDataRubricaRepository.findBySigla(sigla);
    }
}
