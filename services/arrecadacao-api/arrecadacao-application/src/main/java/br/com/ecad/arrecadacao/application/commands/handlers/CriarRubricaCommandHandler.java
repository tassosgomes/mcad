package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.CriarRubricaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.services.SiglaSuggester;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class CriarRubricaCommandHandler implements CommandHandler<CriarRubricaCommand, RubricaResponse> {

    private final RubricaRepository repository;
    private final SiglaSuggester siglaSuggester;
    private final OutboxEventWriter outboxEventWriter;

    public CriarRubricaCommandHandler(RubricaRepository repository,
                                      SiglaSuggester siglaSuggester,
                                      OutboxEventWriter outboxEventWriter) {
        this.repository = repository;
        this.siglaSuggester = siglaSuggester;
        this.outboxEventWriter = outboxEventWriter;
    }

    @Override
    @Transactional
    public RubricaResponse handle(CriarRubricaCommand cmd) {
        String sigla = cmd.siglaSugerida();
        if (sigla == null || sigla.isBlank()) {
            sigla = siglaSuggester.sugerir(cmd.nome());
        }

        if (repository.existsBySigla(sigla)) {
            throw new IllegalArgumentException("Sigla já existe: " + sigla);
        }

        Rubrica entity = new Rubrica(UUID.randomUUID(), sigla, cmd.nome(), cmd.exigeClassificacao());
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
