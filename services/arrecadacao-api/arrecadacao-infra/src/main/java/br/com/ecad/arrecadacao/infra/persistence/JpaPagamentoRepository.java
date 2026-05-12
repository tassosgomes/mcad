package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@SuppressWarnings("null")
public class JpaPagamentoRepository implements PagamentoRepository {

    private final SpringDataPagamentoRepository springData;

    public JpaPagamentoRepository(SpringDataPagamentoRepository springData) {
        this.springData = springData;
    }

    @Override
    public Pagamento save(Pagamento entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<Pagamento> findById(UUID id) {
        return springData.findById(id);
    }

    @Override
    public Page<Pagamento> findAll(Specification<Pagamento> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }

    @Override
    public boolean existsConfirmadoByLicencaIdAndPeriodo(UUID licencaId, String periodo) {
        return springData.existsConfirmadoByLicencaIdAndPeriodo(licencaId, periodo);
    }

    @Override
    public PagamentoAgregado sumAndCountConfirmados(UUID rubricaId, String periodo) {
        return springData.sumAndCountConfirmados(rubricaId, periodo);
    }
}
