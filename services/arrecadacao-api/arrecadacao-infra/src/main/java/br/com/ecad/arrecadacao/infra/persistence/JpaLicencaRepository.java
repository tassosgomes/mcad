package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@SuppressWarnings("null")
public class JpaLicencaRepository implements LicencaRepository {

    private final SpringDataLicencaRepository springData;

    public JpaLicencaRepository(SpringDataLicencaRepository springData) {
        this.springData = springData;
    }

    @Override
    public Licenca save(Licenca entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<Licenca> findById(UUID id) {
        return springData.findById(id);
    }

    @Override
    public Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }
}
