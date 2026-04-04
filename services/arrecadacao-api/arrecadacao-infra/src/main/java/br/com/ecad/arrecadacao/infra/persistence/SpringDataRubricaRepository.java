package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataRubricaRepository extends JpaRepository<Rubrica, UUID> {
    Optional<Rubrica> findBySigla(String sigla);
}
