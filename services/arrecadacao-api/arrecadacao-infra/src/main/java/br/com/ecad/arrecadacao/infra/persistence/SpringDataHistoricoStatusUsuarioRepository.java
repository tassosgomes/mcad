package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpringDataHistoricoStatusUsuarioRepository 
        extends JpaRepository<HistoricoStatusUsuario, UUID> {
    List<HistoricoStatusUsuario> findByUsuarioMusicaIdOrderByDataDesc(UUID usuarioMusicaId);
}
