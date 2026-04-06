package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaUsuarioMusicaRepository implements UsuarioMusicaRepository {
    private final SpringDataUsuarioMusicaRepository springData;

    public JpaUsuarioMusicaRepository(SpringDataUsuarioMusicaRepository springData) {
        this.springData = springData;
    }

    @Override
    public UsuarioMusica save(UsuarioMusica entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<UsuarioMusica> findById(UUID id) {
        return springData.findById(id);
    }

    @Override
    public boolean existsByCnpj(Cnpj cnpj) {
        return springData.existsByCnpj(cnpj);
    }

    @Override
    public Page<UsuarioMusica> findAll(Specification<UsuarioMusica> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }
}
