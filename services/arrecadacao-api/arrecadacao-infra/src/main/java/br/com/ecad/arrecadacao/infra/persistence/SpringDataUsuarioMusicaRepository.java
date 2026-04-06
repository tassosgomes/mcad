package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;

public interface SpringDataUsuarioMusicaRepository 
        extends JpaRepository<UsuarioMusica, UUID>, JpaSpecificationExecutor<UsuarioMusica> {
    boolean existsByCnpj(Cnpj cnpj);
}
