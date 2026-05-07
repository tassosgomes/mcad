package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import java.util.List;
import java.util.Optional;

public interface RubricaRepository {

    List<Rubrica> findAll();

    Optional<Rubrica> findBySigla(String sigla);

    Rubrica upsertBySigla(Rubrica rubrica);
}
