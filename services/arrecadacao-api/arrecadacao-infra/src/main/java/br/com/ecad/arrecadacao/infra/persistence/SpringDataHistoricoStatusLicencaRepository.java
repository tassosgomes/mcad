package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SpringDataHistoricoStatusLicencaRepository
        extends JpaRepository<HistoricoStatusLicenca, UUID> {

    List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId);
}
