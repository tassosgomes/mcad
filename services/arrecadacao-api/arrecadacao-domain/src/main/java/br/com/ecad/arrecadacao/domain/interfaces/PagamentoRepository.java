package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
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
    boolean existsAbertoByLicencaIdAndPeriodo(UUID licencaId, String periodo);

    /**
     * Retorna a soma do valorBruto e a contagem de pagamentos com status CONFIRMADO
     * para a rubrica e período informados.
     *
     * <p>Nunca retorna null: quando não há pagamentos confirmados, retorna
     * {@code PagamentoAgregado(BigDecimal.ZERO, 0)} graças ao COALESCE da query.</p>
     *
     * @param rubricaId ID da rubrica (filtro via join com licenca)
     * @param periodo   período no formato YYYY-MM
     * @return agregado com totalBruto e quantidade (F05 — fonte para VerbaServiceImpl)
     */
    PagamentoAgregado sumAndCountConfirmados(UUID rubricaId, String periodo);
}
