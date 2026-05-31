package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.api.security.CurrentActorResolver;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.EstornarPagamentoCommand;
import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.EstornarPagamentoRequest;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RegistrarPagamentoRequest;
import br.com.ecad.arrecadacao.application.queries.BuscarPagamentoPorIdQuery;
import br.com.ecad.arrecadacao.application.queries.ListarPagamentosQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pagamentos")
public class PagamentoController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PagamentoController.class);

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;
    private final CurrentActorResolver currentActorResolver;
    private final ActorDisplayResolver actorDisplayResolver;

    public PagamentoController(CommandDispatcher commandDispatcher, QueryDispatcher queryDispatcher,
                               CurrentActorResolver currentActorResolver,
                               ActorDisplayResolver actorDisplayResolver) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
        this.currentActorResolver = currentActorResolver;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @GetMapping
    @RequiresPermission("arrecadacao:default:pagamento:listar")
    public ResponseEntity<PageResponse<PagamentoResponse>> listar(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", defaultValue = "-dataRegistro") String sort,
            @RequestParam(name = "usuarioMusicaId", required = false) UUID usuarioMusicaId,
            @RequestParam(name = "razaoSocial", required = false) String razaoSocial,
            @RequestParam(name = "rubricaSigla", required = false) String rubricaSigla,
            @RequestParam(name = "periodo", required = false) String periodo,
            @RequestParam(name = "status", required = false) StatusPagamento status) {
        var query = new ListarPagamentosQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, periodo, status);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @RequiresPermission("arrecadacao:default:pagamento:conciliar")
    public ResponseEntity<PagamentoResponse> registrar(
            @Valid @RequestBody RegistrarPagamentoRequest request,
            Authentication auth) {
        ActorSnapshot actor = resolveActorSnapshot(auth);
        LOGGER.info("Registering payment: licencaId={}, quantidadeUdas={}, user={}",
            request.licencaId(), request.quantidadeUdas(), actor.label());
        var cmd = new RegistrarPagamentoCommand(
            request.licencaId(), request.quantidadeUdas(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(commandDispatcher.dispatch(cmd));
    }

    @GetMapping("/{id}")
    @RequiresPermission("arrecadacao:default:pagamento:visualizar")
    public ResponseEntity<PagamentoResponse> buscarPorId(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarPagamentoPorIdQuery(id)));
    }

    @PostMapping("/{id}/estornar")
    @RequiresPermission("arrecadacao:default:pagamento:estornar")
    public ResponseEntity<PagamentoResponse> estornar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody EstornarPagamentoRequest request,
            Authentication auth) {
        ActorSnapshot actor = resolveActorSnapshot(auth);
        LOGGER.info("Reversing payment: id={}, user={}", id, actor.label());
        var cmd = new EstornarPagamentoCommand(id, request.justificativa(), actor);
        return ResponseEntity.ok(commandDispatcher.dispatch(cmd));
    }

    private ActorSnapshot resolveActorSnapshot(Authentication authentication) {
        return actorDisplayResolver.snapshotFrom(currentActorResolver.resolve(authentication));
    }
}
