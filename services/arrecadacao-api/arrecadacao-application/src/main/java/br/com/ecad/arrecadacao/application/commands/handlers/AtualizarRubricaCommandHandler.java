package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AtualizarRubricaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Component
public class AtualizarRubricaCommandHandler implements CommandHandler<AtualizarRubricaCommand, RubricaResponse> {

    private final RubricaRepository repository;
    private final OutboxEventWriter outboxEventWriter;

    public AtualizarRubricaCommandHandler(RubricaRepository repository,
                                          OutboxEventWriter outboxEventWriter) {
        this.repository = repository;
        this.outboxEventWriter = outboxEventWriter;
    }

    @Override
    @Transactional
    public RubricaResponse handle(AtualizarRubricaCommand cmd) {
        Rubrica entity = repository.findById(cmd.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Rubrica não encontrada"));

        entity.atualizar(cmd.nome(), cmd.exigeClassificacao());
        Rubrica saved = repository.save(entity);

        publicarEvento(saved);

        return mapToResponse(saved);
    }

    private void publicarEvento(Rubrica rubrica) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("sigla", rubrica.getSigla());
        payload.put("nome", rubrica.getNome());
        payload.put("exigeClassificacao", rubrica.isExigeClassificacao());
        payload.put("ativo", rubrica.isAtivo());
        outboxEventWriter.addEvent(
            "arrecadacao.rubrica.atualizada",
            rubrica.getId().toString(),
            payload
        );
    }

    private RubricaResponse mapToResponse(Rubrica r) {
        return new RubricaResponse(
            r.getId(), r.getSigla(), r.getNome(), r.isExigeClassificacao(), r.isAtivo()
        );
    }
}
