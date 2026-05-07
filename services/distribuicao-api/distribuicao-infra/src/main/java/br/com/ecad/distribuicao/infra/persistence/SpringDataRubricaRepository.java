package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataRubricaRepository extends JpaRepository<Rubrica, UUID> {

    Optional<Rubrica> findBySigla(String sigla);
}
