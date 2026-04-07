package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class JpaUdaValorRepository implements UdaValorRepository {

    private final SpringDataUdaValorRepository springData;

    public JpaUdaValorRepository(SpringDataUdaValorRepository springData) {
        this.springData = springData;
    }

    @Override
    public UdaValor save(UdaValor entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<UdaValor> findVigente(LocalDate data) {
        return springData.findTopByDataVigenciaLessThanEqualOrderByDataVigenciaDesc(data);
    }

    @Override
    public List<UdaValor> findAllOrderByDataVigenciaDesc() {
        return springData.findAllByOrderByDataVigenciaDesc();
    }
}
