package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.api.security.CurrentActorResolver;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.AtivarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.AtualizarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.CriarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.InativarRubricaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.AtualizarRubricaRequest;
import br.com.ecad.arrecadacao.application.dto.CriarRubricaRequest;
import br.com.ecad.arrecadacao.application.dto.InativarRubricaRequest;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarRubricaPorIdQuery;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rubricas")
@SuppressWarnings("null")
public class RubricaController {

    private static final Logger log = LoggerFactory.getLogger(RubricaController.class);

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;
    private final CurrentActorResolver currentActorResolver;
    private final ActorDisplayResolver actorDisplayResolver;
    private final RubricaRepository rubricaRepository;

    public RubricaController(CommandDispatcher commandDispatcher,
                             QueryDispatcher queryDispatcher,
                             CurrentActorResolver currentActorResolver,
                             ActorDisplayResolver actorDisplayResolver,
                             RubricaRepository rubricaRepository) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
        this.currentActorResolver = currentActorResolver;
        this.actorDisplayResolver = actorDisplayResolver;
        this.rubricaRepository = rubricaRepository;
    }

    @GetMapping
    @RequiresPermission("arrecadacao:default:rubrica:visualizar")
    public ResponseEntity<List<RubricaResumoResponse>> listar() {
        var rubricas = rubricaRepository.findAll().stream()
            .map(r -> new RubricaResumoResponse(r.getId(), r.getSigla(), r.getNome(), r.isAtivo()))
            .toList();
        return ResponseEntity.ok(rubricas);
    }

    @GetMapping("/{id}")
    @RequiresPermission("arrecadacao:default:rubrica:visualizar")
    public ResponseEntity<RubricaResponse> buscarPorId(@PathVariable("id") UUID id) {
        log.info("Buscando rubrica {}", id);
        var query = new BuscarRubricaPorIdQuery(id);
        return ResponseEntity.ok((RubricaResponse) queryDispatcher.dispatch(query));
    }

    @PostMapping
    @RequiresPermission("arrecadacao:default:rubrica:criar")
    public ResponseEntity<RubricaResponse> criar(@Valid @RequestBody CriarRubricaRequest request,
                                                 Authentication authentication) {
        log.info("Criando rubrica {}", request.nome());
        var command = new CriarRubricaCommand(
                request.nome(), request.exigeClassificacao(), request.sigla(),
                resolveActorSnapshot(authentication));
        var response = (RubricaResponse) commandDispatcher.dispatch(command);
        return ResponseEntity.created(URI.create("/api/v1/rubricas/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission("arrecadacao:default:rubrica:editar")
    public ResponseEntity<RubricaResponse> atualizar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody AtualizarRubricaRequest request,
            Authentication authentication) {
        log.info("Atualizando rubrica {}", id);
        var command = new AtualizarRubricaCommand(
                id, request.nome(), request.exigeClassificacao(),
                resolveActorSnapshot(authentication));
        var response = (RubricaResponse) commandDispatcher.dispatch(command);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/inativar")
    @RequiresPermission("arrecadacao:default:rubrica:inativar")
    public ResponseEntity<RubricaResponse> inativar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody InativarRubricaRequest request,
            Authentication authentication) {
        log.info("Inativando rubrica {}", id);
        var command = new InativarRubricaCommand(
                id, request.justificativa(), resolveActorSnapshot(authentication));
        commandDispatcher.dispatch(command);
        return buscarPorId(id);
    }

    @PostMapping("/{id}/ativar")
    @RequiresPermission("arrecadacao:default:rubrica:editar")
    public ResponseEntity<RubricaResponse> ativar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody InativarRubricaRequest request,
            Authentication authentication) {
        log.info("Ativando rubrica {}", id);
        var command = new AtivarRubricaCommand(
                id, request.justificativa(), resolveActorSnapshot(authentication));
        commandDispatcher.dispatch(command);
        return buscarPorId(id);
    }

    private ActorSnapshot resolveActorSnapshot(Authentication authentication) {
        return actorDisplayResolver.snapshotFrom(currentActorResolver.resolve(authentication));
    }
}
