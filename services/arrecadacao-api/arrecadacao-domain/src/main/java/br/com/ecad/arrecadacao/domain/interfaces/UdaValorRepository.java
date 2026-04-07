package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.UdaValor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UdaValorRepository {
    UdaValor save(UdaValor entity);
    Optional<UdaValor> findVigente(LocalDate data);
    List<UdaValor> findAllOrderByDataVigenciaDesc();
}
