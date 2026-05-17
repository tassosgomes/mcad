package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.CreditoRetidoReavaliacao;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRetidoReavaliacaoRepository;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaCreditoRetidoReavaliacaoRepository implements CreditoRetidoReavaliacaoRepository {

    private final EntityManager entityManager;

    public JpaCreditoRetidoReavaliacaoRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    @Transactional
    public List<CreditoRetidoReavaliacao> saveAll(List<CreditoRetidoReavaliacao> reavaliacoes) {
        List<CreditoRetidoReavaliacao> managed = new ArrayList<>();
        for (CreditoRetidoReavaliacao reavaliacao : reavaliacoes) {
            managed.add(entityManager.merge(reavaliacao));
        }
        return List.copyOf(managed);
    }
}
