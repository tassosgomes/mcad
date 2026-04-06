package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class JpaHistoricoStatusLicencaRepository implements HistoricoStatusLicencaRepository {

    private final SpringDataHistoricoStatusLicencaRepository springData;

    public JpaHistoricoStatusLicencaRepository(SpringDataHistoricoStatusLicencaRepository springData) {
        this.springData = springData;
    }

    @Override
    public HistoricoStatusLicenca save(HistoricoStatusLicenca entity) {
        return springData.save(entity);
    }

    @Override
    public List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId) {
        return springData.findByLicencaIdOrderByDataDesc(licencaId);
    }
}
