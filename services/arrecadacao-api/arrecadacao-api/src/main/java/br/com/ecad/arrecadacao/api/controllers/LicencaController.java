package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.commands.CriarLicencaCommand;
import br.com.ecad.arrecadacao.application.commands.EncerrarLicencaCommand;
import br.com.ecad.arrecadacao.application.commands.ReativarLicencaCommand;
import br.com.ecad.arrecadacao.application.commands.SuspenderLicencaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandDispatcher;
import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.CriarLicencaRequest;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusLicencaResponse;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.TransicaoStatusRequest;
import br.com.ecad.arrecadacao.application.queries.BuscarLicencaPorIdQuery;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusLicencaQuery;
import br.com.ecad.arrecadacao.application.queries.ListarLicencasQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/licencas")
public class LicencaController {

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    public LicencaController(CommandDispatcher commandDispatcher,
                              QueryDispatcher queryDispatcher) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping
    public ResponseEntity<PageResponse<LicencaResponse>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) UUID usuarioMusicaId,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String rubricaSigla,
            @RequestParam(required = false) StatusLicenca status,
            @RequestParam(required = false) Boolean vigente) {
        var query = new ListarLicencasQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, status, vigente);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<LicencaResponse> criar(
            @Valid @RequestBody CriarLicencaRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new CriarLicencaCommand(
            request.usuarioMusicaId(), request.rubricaId(),
            request.dataInicio(), request.dataFim(), autor);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LicencaResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarLicencaPorIdQuery(id)));
    }

    @PostMapping("/{id}/suspender")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<LicencaResponse> suspender(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new SuspenderLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/reativar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<LicencaResponse> reativar(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new ReativarLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/encerrar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<LicencaResponse> encerrar(
            @PathVariable UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            JwtAuthenticationToken principal) {
        var autor = extrairAutor(principal);
        var command = new EncerrarLicencaCommand(id, request.justificativa(), autor);
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}/historico-status")
    public ResponseEntity<List<HistoricoStatusLicencaResponse>> listarHistorico(
            @PathVariable UUID id) {
        return ResponseEntity.ok(
            queryDispatcher.dispatch(new ListarHistoricoStatusLicencaQuery(id)));
    }

    // Extrai autor do JWT: preferred_username com fallback para sub
    private String extrairAutor(JwtAuthenticationToken principal) {
        var preferred = principal.getToken().getClaimAsString("preferred_username");
        return (preferred != null && !preferred.isBlank())
            ? preferred
            : principal.getToken().getSubject();
    }
}
