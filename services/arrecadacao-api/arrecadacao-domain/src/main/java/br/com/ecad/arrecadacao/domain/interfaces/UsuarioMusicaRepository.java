package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UsuarioMusicaRepository {
    UsuarioMusica save(UsuarioMusica entity);
    Optional<UsuarioMusica> findById(UUID id);
    boolean existsByCnpj(Cnpj cnpj);
    Page<UsuarioMusica> findAll(Specification<UsuarioMusica> spec, Pageable pageable);
    List<UsuarioMusica> findAll();
}
