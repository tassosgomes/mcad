package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CreditoLiberacaoRepository {

    List<Credito> findCandidatosRetidos(UUID processoAtualId, String rubricaSigla, String periodo);

    List<CreditoLiberacao> findPrevistasByProcessoLiberacaoId(UUID processoId);

    List<CreditoLiberacao> findByProcessoLiberacaoId(UUID processoId);

    List<CreditoLiberacao> saveAll(List<CreditoLiberacao> liberacoes);

    int cancelarPrevistasByProcessoLiberacaoId(UUID processoId, Instant canceladoEm);
}
