package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;
import java.util.UUID;

public interface PagamentoRepository {
    Pagamento save(Pagamento entity);
    Optional<Pagamento> findById(UUID id);
    Page<Pagamento> findAll(Specification<Pagamento> spec, Pageable pageable);
    boolean existsConfirmadoByLicencaIdAndPeriodo(UUID licencaId, String periodo);
}
