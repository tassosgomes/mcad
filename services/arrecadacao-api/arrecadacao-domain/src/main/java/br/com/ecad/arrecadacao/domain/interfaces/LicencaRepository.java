package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.Licenca;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;
import java.util.UUID;

public interface LicencaRepository {
    Licenca save(Licenca entity);
    Optional<Licenca> findById(UUID id);
    Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable);
}
