package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Licenca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SpringDataLicencaRepository
        extends JpaRepository<Licenca, UUID>, JpaSpecificationExecutor<Licenca> {
}
