package br.com.ecad.arrecadacao.api.controllers;

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

    public UdaController(CommandDispatcher commandDispatcher, QueryDispatcher queryDispatcher) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
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
        LOGGER.info("Adjusting UDA value: valor={}, dataVigencia={}, user={}",
            request.valor(), request.dataVigencia(), auth.getName());
        var cmd = new AjustarUdaCommand(request.valor(), request.dataVigencia(), auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(commandDispatcher.dispatch(cmd));
    }

    @GetMapping("/historico")
    @RequiresPermission("arrecadacao:default:cobranca:listar")
    public ResponseEntity<List<UdaResponse>> listarHistorico() {
        return ResponseEntity.ok(queryDispatcher.dispatch(new ListarHistoricoUdaQuery()));
    }
}
