package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.enums.StatusLiberacaoCredito;
import br.com.ecad.distribuicao.domain.interfaces.CreditoLiberacaoRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings({"unchecked", "null"})
public class JpaCreditoLiberacaoRepository implements CreditoLiberacaoRepository {

    private final EntityManager entityManager;

    public JpaCreditoLiberacaoRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public List<Credito> findCandidatosRetidos(UUID processoAtualId, String rubricaSigla, String periodo) {
        return entityManager
                .createNativeQuery("""
                        SELECT c.*
                        FROM distribuicao.creditos c
                        JOIN distribuicao.processos p ON p.id = c.processo_id
                        WHERE c.status = 'RETIDO'
                          AND p.status = 'FINALIZADO'
                          AND p.rubrica_sigla = :rubricaSigla
                          AND p.periodo < :periodo
                          AND p.id <> :processoAtualId
                          AND NOT EXISTS (
                              SELECT 1
                              FROM distribuicao.credito_liberacoes l
                              WHERE l.credito_retido_id = c.id
                                AND l.status IN ('PREVISTA', 'EFETIVADA')
                          )
                        ORDER BY p.periodo ASC, c.criado_em ASC, c.id ASC
                        FOR UPDATE OF c SKIP LOCKED
                        """, Credito.class)
                .setParameter("rubricaSigla", rubricaSigla)
                .setParameter("periodo", periodo)
                .setParameter("processoAtualId", processoAtualId)
                .getResultList();
    }

    @Override
    public List<CreditoLiberacao> findPrevistasByProcessoLiberacaoId(UUID processoId) {
        return entityManager
                .createQuery("""
                        select liberacao from CreditoLiberacao liberacao
                        where liberacao.processoLiberacaoId = :processoId
                          and liberacao.status = :status
                        order by liberacao.avaliadoEm asc, liberacao.id asc
                        """, CreditoLiberacao.class)
                .setParameter("processoId", processoId)
                .setParameter("status", StatusLiberacaoCredito.PREVISTA)
                .getResultList();
    }

    @Override
    public List<CreditoLiberacao> findByProcessoLiberacaoId(UUID processoId) {
        return entityManager
                .createQuery("""
                        select liberacao from CreditoLiberacao liberacao
                        where liberacao.processoLiberacaoId = :processoId
                        order by liberacao.avaliadoEm asc, liberacao.id asc
                        """, CreditoLiberacao.class)
                .setParameter("processoId", processoId)
                .getResultList();
    }

    @Override
    @Transactional
    public List<CreditoLiberacao> saveAll(List<CreditoLiberacao> liberacoes) {
        List<CreditoLiberacao> managed = new ArrayList<>();
        for (CreditoLiberacao liberacao : liberacoes) {
            managed.add(entityManager.merge(liberacao));
        }
        return List.copyOf(managed);
    }

    @Override
    @Transactional
    public int cancelarPrevistasByProcessoLiberacaoId(UUID processoId, Instant canceladoEm) {
        List<CreditoLiberacao> previstas = findPrevistasByProcessoLiberacaoId(processoId);
        previstas.forEach(liberacao -> liberacao.cancelar(canceladoEm));
        return previstas.size();
    }
}
