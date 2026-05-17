package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaCreditoRepository implements CreditoRepository {

    private final EntityManager entityManager;

    public JpaCreditoRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager);
    }

    @Override
    @Transactional
    public void deleteByProcessoId(UUID processoId) {
        entityManager
                .createQuery("delete from Credito credito where credito.processoId = :processoId")
                .setParameter("processoId", processoId)
                .executeUpdate();
    }

    @Override
    @Transactional
    public List<Credito> saveAll(List<Credito> creditos) {
        Objects.requireNonNull(creditos, "creditos must not be null")
                .forEach(entityManager::persist);
        return List.copyOf(creditos);
    }

    @Override
    public Page<Credito> findByProcessoId(CreditoFiltro filtro, Pageable pageable) {
        Objects.requireNonNull(filtro, "filtro must not be null");
        Objects.requireNonNull(pageable, "pageable must not be null");

        // WHERE construido condicionalmente para evitar o padrao
        // ":param is null or x = :param", que quebra quando o driver PostgreSQL
        // esta configurado com stringtype=unspecified (necessario para INSERTs
        // jsonb do audit-sdk). Sem tipo explicito, o servidor recusa com
        // "could not determine data type of parameter $N".
        StringBuilder whereClause = new StringBuilder("where credito.processoId = :processoId");
        if (filtro.categoria() != null) {
            whereClause.append(" and credito.categoria = :categoria");
        }
        if (filtro.titularId() != null) {
            whereClause.append(" and credito.titularId = :titularId");
        }
        if (filtro.obraId() != null) {
            whereClause.append(" and credito.obraId = :obraId");
        }
        if (filtro.status() != null) {
            whereClause.append(" and credito.status = :status");
        }
        if (filtro.motivoRetencao() != null) {
            whereClause.append(" and credito.motivoRetencao = :motivoRetencao");
        }

        TypedQuery<Credito> query = entityManager.createQuery(
                "select credito from Credito credito "
                        + whereClause
                        + " order by credito.criadoEm asc, credito.id asc",
                Credito.class);
        setFiltroParameters(query, filtro);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        TypedQuery<Long> countQuery = entityManager.createQuery(
                "select count(credito) from Credito credito " + whereClause,
                Long.class);
        setFiltroParameters(countQuery, filtro);

        return new PageImpl<>(query.getResultList(), pageable, countQuery.getSingleResult());
    }

    @Override
    public Optional<CalculoResumoProjection> buscarResumo(UUID processoId) {
        return entityManager
                .createQuery("""
                        select new br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection(
                            processo.id,
                            processo.status,
                            processo.rubricaSigla,
                            processo.periodo,
                            processo.verbaLiquida,
                            processo.totalExecucoes,
                            processo.totalObras,
                            processo.totalPontos,
                            processo.totalCreditos,
                            processo.valorTotalCalculado,
                            processo.totalCreditosRetidos,
                            processo.valorTotalRetido,
                            processo.calculadoEm
                        )
                        from ProcessoDistribuicao processo
                        where processo.id = :processoId
                        """, CalculoResumoProjection.class)
                .setParameter("processoId", processoId)
                .getResultStream()
                .findFirst();
    }

    private void setFiltroParameters(TypedQuery<?> query, CreditoFiltro filtro) {
        query.setParameter("processoId", filtro.processoId());
        // Bind apenas parametros usados pelo WHERE construido em findByProcessoId.
        if (filtro.categoria() != null) {
            query.setParameter("categoria", filtro.categoria());
        }
        if (filtro.titularId() != null) {
            query.setParameter("titularId", filtro.titularId());
        }
        if (filtro.obraId() != null) {
            query.setParameter("obraId", filtro.obraId());
        }
        if (filtro.status() != null) {
            query.setParameter("status", filtro.status());
        }
        if (filtro.motivoRetencao() != null) {
            query.setParameter("motivoRetencao", filtro.motivoRetencao());
        }
    }
}
