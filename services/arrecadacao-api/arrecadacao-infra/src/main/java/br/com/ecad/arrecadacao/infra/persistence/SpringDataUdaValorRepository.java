package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpringDataUdaValorRepository extends JpaRepository<UdaValor, UUID> {

    @Query("SELECT u FROM UdaValor u WHERE u.dataVigencia <= :data ORDER BY u.dataVigencia DESC LIMIT 1")
    Optional<UdaValor> findTopByDataVigenciaLessThanEqualOrderByDataVigenciaDesc(@Param("data") LocalDate data);

    List<UdaValor> findAllByOrderByDataVigenciaDesc();
}
