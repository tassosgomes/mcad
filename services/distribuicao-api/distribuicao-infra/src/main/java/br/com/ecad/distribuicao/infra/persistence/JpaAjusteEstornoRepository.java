package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.filters.AjusteEstornoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoPage;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import jakarta.persistence.EntityManager;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings({"unchecked", "null"})
public class JpaAjusteEstornoRepository implements AjusteEstornoRepository {

    private final SpringDataAjusteEstornoRepository springDataRepository;
    private final EntityManager entityManager;

    public JpaAjusteEstornoRepository(
            SpringDataAjusteEstornoRepository springDataRepository,
            EntityManager entityManager) {
        this.springDataRepository =
                Objects.requireNonNull(springDataRepository, "springDataRepository must not be null");
        this.entityManager =
                Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public Optional<AjusteEstorno> findById(UUID id) {
        return springDataRepository.findById(id);
    }

    @Override
    public Optional<AjusteEstorno> findByEventId(UUID eventId) {
        return springDataRepository.findByEventId(eventId);
    }

    @Override
    public Optional<AjusteEstorno> findByPagamentoId(UUID pagamentoId) {
        return springDataRepository.findByPagamentoId(pagamentoId);
    }

    @Override
    @Transactional
    public AjusteEstorno save(AjusteEstorno ajuste) {
        return springDataRepository.save(ajuste);
    }

    @Override
    public AjusteEstornoPage findAll(AjusteEstornoFiltro filtro, int page, int size) {
        Objects.requireNonNull(filtro, "filtro must not be null");

        var spec = AjusteEstornoSpecification.comFiltros(
                filtro.rubrica(),
                filtro.periodoOrigem(),
                filtro.status(),
                filtro.pagamentoId());

        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "recebidoEm"));
        Page<AjusteEstorno> result = springDataRepository.findAll(spec, pageable);

        return new AjusteEstornoPage(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Override
    public List<AjusteEstorno> findPendentesElegiveisForUpdate(
            String rubricaSigla, String periodoAplicacao) {
        // Usa native query com FOR UPDATE SKIP LOCKED — mesmo padrão adotado em
        // JpaCreditoLiberacaoRepository.findCandidatosRetidos para evitar concorrência.
        // A regra de filtragem por período de origem (processo FINALIZADO exige período
        // anterior ao periodoAplicacao) é responsabilidade do service na Fase C.
        return entityManager
                .createNativeQuery("""
                        SELECT a.*
                        FROM distribuicao.ajustes_estorno a
                        WHERE a.status = 'PENDENTE_APLICACAO'
                          AND a.rubrica_sigla = :rubricaSigla
                          AND a.processo_aplicacao_id IS NULL
                        ORDER BY a.estornado_em ASC, a.pagamento_id ASC
                        FOR UPDATE SKIP LOCKED
                        """, AjusteEstorno.class)
                .setParameter("rubricaSigla", rubricaSigla)
                .getResultList();
    }

    @Override
    public List<AjusteEstorno> findPrevistosByProcessoAplicacaoId(UUID processoId) {
        return springDataRepository.findByProcessoAplicacaoIdAndStatus(
                processoId, StatusAjusteEstorno.PREVISTO);
    }

    @Override
    public List<AjusteEstorno> findByProcessoAplicacaoIdAndStatusIn(
            UUID processoId, Collection<StatusAjusteEstorno> statuses) {
        return springDataRepository.findByProcessoAplicacaoIdAndStatusIn(processoId, statuses);
    }

    @Override
    public boolean existsBloqueioSnapshotDesatualizado(UUID processoId) {
        return springDataRepository.existsBloqueioSnapshotDesatualizado(processoId);
    }
}
