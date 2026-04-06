package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;

import java.util.List;
import java.util.UUID;

public interface HistoricoStatusLicencaRepository {
    HistoricoStatusLicenca save(HistoricoStatusLicenca entity);
    List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId);
}
