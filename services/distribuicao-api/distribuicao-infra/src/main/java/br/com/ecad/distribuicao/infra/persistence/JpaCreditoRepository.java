package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final SpringDataCreditoRepository springDataCreditoRepository;

    public JpaCreditoRepository(
            EntityManager entityManager,
            SpringDataCreditoRepository springDataCreditoRepository) {
        this.entityManager = Objects.requireNonNull(entityManager);
        this.springDataCreditoRepository =
                Objects.requireNonNull(springDataCreditoRepository, "springDataCreditoRepository must not be null");
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
    public Optional<Credito> findById(UUID creditoId) {
        return Optional.ofNullable(entityManager.find(Credito.class, creditoId));
    }

    @Override
    public Optional<Credito> findByIdForUpdate(UUID creditoId) {
        Credito credito = entityManager.find(Credito.class, creditoId, LockModeType.PESSIMISTIC_WRITE);
        return Optional.ofNullable(credito);
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
                            processo.totalCreditosRetidosLiberados,
                            processo.valorTotalRetidosLiberados,
                            processo.calculadoEm
                        )
                        from ProcessoDistribuicao processo
                        where processo.id = :processoId
                        """, CalculoResumoProjection.class)
                .setParameter("processoId", processoId)
                .getResultStream()
                .findFirst();
    }

    @Override
    public List<Credito> findByProcessoIdForAjuste(UUID processoId) {
        return springDataCreditoRepository.findByProcessoIdForAjuste(processoId);
    }

    @Override
    public List<TitularDemonstrativoProjection> findTitularesByProcessoId(
            UUID processoId, String titularNomeFiltro, Pageable pageable) {
        StringBuilder jpql = new StringBuilder("""
            SELECT new br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection(
                c.titularId,
                c.titularNome,
                SUM(CASE WHEN c.status = br.com.ecad.distribuicao.domain.enums.StatusCredito.CALCULADO THEN c.valorCredito ELSE 0 END),
                SUM(CASE WHEN c.status = br.com.ecad.distribuicao.domain.enums.StatusCredito.RETIDO THEN c.valorCredito ELSE 0 END),
                COUNT(DISTINCT CASE WHEN c.status = br.com.ecad.distribuicao.domain.enums.StatusCredito.CALCULADO THEN c.obraId ELSE NULL END)
            )
            FROM Credito c
            WHERE c.processoId = :processoId
            """);
        if (titularNomeFiltro != null && !titularNomeFiltro.isBlank()) {
            jpql.append(" AND LOWER(c.titularNome) LIKE LOWER(CONCAT('%', :filtroNome, '%'))");
        }
        jpql.append(" GROUP BY c.titularId, c.titularNome");
        jpql.append(" ORDER BY LOWER(c.titularNome) ASC");

        TypedQuery<TitularDemonstrativoProjection> query =
                entityManager.createQuery(jpql.toString(), TitularDemonstrativoProjection.class);
        query.setParameter("processoId", processoId);
        if (titularNomeFiltro != null && !titularNomeFiltro.isBlank()) {
            query.setParameter("filtroNome", titularNomeFiltro);
        }
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());
        return query.getResultList();
    }

    @Override
    public long countTitularesByProcessoId(UUID processoId, String titularNomeFiltro) {
        StringBuilder jpql = new StringBuilder("""
            SELECT COUNT(DISTINCT c.titularId)
            FROM Credito c
            WHERE c.processoId = :processoId
            """);
        if (titularNomeFiltro != null && !titularNomeFiltro.isBlank()) {
            jpql.append(" AND LOWER(c.titularNome) LIKE LOWER(CONCAT('%', :filtroNome, '%'))");
        }
        TypedQuery<Long> query = entityManager.createQuery(jpql.toString(), Long.class);
        query.setParameter("processoId", processoId);
        if (titularNomeFiltro != null && !titularNomeFiltro.isBlank()) {
            query.setParameter("filtroNome", titularNomeFiltro);
        }
        return query.getSingleResult();
    }

    @Override
    public List<Credito> findByProcessoAndTitularAndStatus(
            UUID processoId, UUID titularId, StatusCredito status) {
        return entityManager.createQuery("""
            SELECT c FROM Credito c
            WHERE c.processoId = :processoId
              AND c.titularId = :titularId
              AND c.status = :status
            ORDER BY c.criadoEm ASC
            """, Credito.class)
            .setParameter("processoId", processoId)
            .setParameter("titularId", titularId)
            .setParameter("status", status)
            .getResultList();
    }

    @Override
    public List<Credito> findLiberadosByProcessoLiberacaoAndTitular(
            UUID processoLiberacaoId, UUID titularId) {
        return entityManager.createQuery("""
            SELECT c FROM Credito c
            WHERE c.processoLiberacaoId = :processoLiberacaoId
              AND c.titularId = :titularId
              AND c.status = br.com.ecad.distribuicao.domain.enums.StatusCredito.LIBERADO
            ORDER BY c.criadoEm ASC
            """, Credito.class)
            .setParameter("processoLiberacaoId", processoLiberacaoId)
            .setParameter("titularId", titularId)
            .getResultList();
    }

    @Override
    public Map<UUID, BigDecimal> sumLiberadosByProcessoLiberacaoId(UUID processoLiberacaoId) {
        List<Object[]> results = entityManager.createQuery("""
            SELECT c.titularId, SUM(c.valorCredito)
            FROM Credito c
            WHERE c.processoLiberacaoId = :processoLiberacaoId
              AND c.status = br.com.ecad.distribuicao.domain.enums.StatusCredito.LIBERADO
            GROUP BY c.titularId
            """, Object[].class)
            .setParameter("processoLiberacaoId", processoLiberacaoId)
            .getResultList();

        Map<UUID, BigDecimal> map = new HashMap<>();
        for (Object[] row : results) {
            map.put((UUID) row[0], (BigDecimal) row[1]);
        }
        return map;
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
