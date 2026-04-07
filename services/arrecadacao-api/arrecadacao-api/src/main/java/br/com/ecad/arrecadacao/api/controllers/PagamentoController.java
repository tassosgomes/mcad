package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.dto.RegistrarPagamentoRequest;
import br.com.ecad.arrecadacao.application.queries.BuscarPagamentoPorIdQuery;
import br.com.ecad.arrecadacao.application.queries.ListarPagamentosQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pagamentos")
public class PagamentoController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PagamentoController.class);

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    public PagamentoController(CommandDispatcher commandDispatcher, QueryDispatcher queryDispatcher) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping
    public ResponseEntity<PageResponse<PagamentoResponse>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "-dataRegistro") String sort,
            @RequestParam(required = false) UUID usuarioMusicaId,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String rubricaSigla,
            @RequestParam(required = false) String periodo,
            @RequestParam(required = false) StatusPagamento status) {
        var query = new ListarPagamentosQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, periodo, status);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<PagamentoResponse> registrar(
            @Valid @RequestBody RegistrarPagamentoRequest request,
            Authentication auth) {
        LOGGER.info("Registering payment: licencaId={}, quantidadeUdas={}, user={}",
            request.licencaId(), request.quantidadeUdas(), auth.getName());
        var cmd = new RegistrarPagamentoCommand(
            request.licencaId(), request.quantidadeUdas(), auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(commandDispatcher.dispatch(cmd));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PagamentoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarPagamentoPorIdQuery(id)));
    }
}
