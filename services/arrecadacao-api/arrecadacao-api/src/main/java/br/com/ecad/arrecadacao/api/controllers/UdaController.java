package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.api.security.CurrentActorResolver;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.AjustarUdaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.AjustarUdaRequest;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.application.queries.ConsultarUdaVigenteQuery;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoUdaQuery;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/uda")
public class UdaController {

    private static final Logger LOGGER = LoggerFactory.getLogger(UdaController.class);

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;
    private final CurrentActorResolver currentActorResolver;
    private final ActorDisplayResolver actorDisplayResolver;

    public UdaController(CommandDispatcher commandDispatcher, QueryDispatcher queryDispatcher,
                         CurrentActorResolver currentActorResolver,
                         ActorDisplayResolver actorDisplayResolver) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
        this.currentActorResolver = currentActorResolver;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @GetMapping("/vigente")
    @RequiresPermission("arrecadacao:default:cobranca:listar")
    public ResponseEntity<UdaResponse> consultarVigente() {
        return ResponseEntity.ok(queryDispatcher.dispatch(new ConsultarUdaVigenteQuery()));
    }

    @PostMapping
    @RequiresPermission("arrecadacao:default:cobranca:emitir")
    public ResponseEntity<UdaResponse> ajustar(@Valid @RequestBody AjustarUdaRequest request,
                                               Authentication auth) {
        ActorSnapshot actor = resolveActorSnapshot(auth);
        LOGGER.info("Adjusting UDA value: valor={}, dataVigencia={}, user={}",
            request.valor(), request.dataVigencia(), actor.label());
        var cmd = new AjustarUdaCommand(request.valor(), request.dataVigencia(), actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(commandDispatcher.dispatch(cmd));
    }

    @GetMapping("/historico")
    @RequiresPermission("arrecadacao:default:cobranca:listar")
    public ResponseEntity<List<UdaResponse>> listarHistorico() {
        return ResponseEntity.ok(queryDispatcher.dispatch(new ListarHistoricoUdaQuery()));
    }

    private ActorSnapshot resolveActorSnapshot(Authentication authentication) {
        return actorDisplayResolver.snapshotFrom(currentActorResolver.resolve(authentication));
    }
}
