package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class JpaHistoricoStatusUsuarioRepository implements HistoricoStatusUsuarioRepository {
    private final SpringDataHistoricoStatusUsuarioRepository springData;

    public JpaHistoricoStatusUsuarioRepository(SpringDataHistoricoStatusUsuarioRepository springData) {
        this.springData = springData;
    }

    @Override
    public HistoricoStatusUsuario save(HistoricoStatusUsuario entity) {
        return springData.save(entity);
    }

    @Override
    public List<HistoricoStatusUsuario> findByUsuarioMusicaIdOrderByDataDesc(UUID usuarioMusicaId) {
        return springData.findByUsuarioMusicaIdOrderByDataDesc(usuarioMusicaId);
    }
}
