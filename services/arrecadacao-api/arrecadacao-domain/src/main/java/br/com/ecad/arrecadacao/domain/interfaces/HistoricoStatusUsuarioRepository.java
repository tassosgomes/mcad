package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import java.util.List;
import java.util.UUID;

public interface HistoricoStatusUsuarioRepository {
    HistoricoStatusUsuario save(HistoricoStatusUsuario entity);
    List<HistoricoStatusUsuario> findByUsuarioMusicaIdOrderByDataDesc(UUID usuarioMusicaId);
}
