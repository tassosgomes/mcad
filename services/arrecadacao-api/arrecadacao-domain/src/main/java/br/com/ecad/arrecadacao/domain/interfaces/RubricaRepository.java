package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import java.util.List;
import java.util.Optional;

public interface RubricaRepository {
    List<Rubrica> findAll();

    Optional<Rubrica> findBySigla(String sigla);
    Optional<Rubrica> findById(java.util.UUID id);
}
