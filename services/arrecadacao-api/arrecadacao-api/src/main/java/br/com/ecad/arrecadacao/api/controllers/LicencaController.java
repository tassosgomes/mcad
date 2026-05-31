package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.api.security.CurrentActorResolver;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
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
import br.org.ecad.authz.sdk.annotation.RequiresPermission;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/licencas")
public class LicencaController {

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;
    private final CurrentActorResolver currentActorResolver;
    private final ActorDisplayResolver actorDisplayResolver;

    public LicencaController(CommandDispatcher commandDispatcher,
                              QueryDispatcher queryDispatcher,
                              CurrentActorResolver currentActorResolver,
                              ActorDisplayResolver actorDisplayResolver) {
        this.commandDispatcher = commandDispatcher;
        this.queryDispatcher = queryDispatcher;
        this.currentActorResolver = currentActorResolver;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @GetMapping
    @RequiresPermission("arrecadacao:default:contrato:listar")
    public ResponseEntity<PageResponse<LicencaResponse>> listar(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "usuarioMusicaId", required = false) UUID usuarioMusicaId,
            @RequestParam(name = "razaoSocial", required = false) String razaoSocial,
            @RequestParam(name = "rubricaSigla", required = false) String rubricaSigla,
            @RequestParam(name = "status", required = false) StatusLicenca status,
            @RequestParam(name = "vigente", required = false) Boolean vigente) {
        var query = new ListarLicencasQuery(page, size, sort,
            usuarioMusicaId, razaoSocial, rubricaSigla, status, vigente);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @PostMapping
    @RequiresPermission("arrecadacao:default:contrato:criar")
    public ResponseEntity<LicencaResponse> criar(
            @Valid @RequestBody CriarLicencaRequest request,
            Authentication authentication) {
        var actor = resolveActorSnapshot(authentication);
        var command = new CriarLicencaCommand(
            request.usuarioMusicaId(), request.rubricaId(),
            request.dataInicio(), request.dataFim(), actor);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}")
    @RequiresPermission("arrecadacao:default:contrato:visualizar")
    public ResponseEntity<LicencaResponse> buscarPorId(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarLicencaPorIdQuery(id)));
    }

    @PostMapping("/{id}/suspender")
    @RequiresPermission("arrecadacao:default:contrato:editar")
    public ResponseEntity<LicencaResponse> suspender(
            @PathVariable("id") UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            Authentication authentication) {
        var command = new SuspenderLicencaCommand(
            id, request.justificativa(), resolveActorSnapshot(authentication));
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/reativar")
    @RequiresPermission("arrecadacao:default:contrato:editar")
    public ResponseEntity<LicencaResponse> reativar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            Authentication authentication) {
        var command = new ReativarLicencaCommand(
            id, request.justificativa(), resolveActorSnapshot(authentication));
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @PostMapping("/{id}/encerrar")
    @RequiresPermission("arrecadacao:default:contrato:cancelar")
    public ResponseEntity<LicencaResponse> encerrar(
            @PathVariable("id") UUID id,
            @Valid @RequestBody TransicaoStatusRequest request,
            Authentication authentication) {
        var command = new EncerrarLicencaCommand(
            id, request.justificativa(), resolveActorSnapshot(authentication));
        return ResponseEntity.ok(commandDispatcher.dispatch(command));
    }

    @GetMapping("/{id}/historico-status")
    @RequiresPermission("arrecadacao:default:contrato:visualizar")
    public ResponseEntity<List<HistoricoStatusLicencaResponse>> listarHistorico(
            @PathVariable("id") UUID id) {
        return ResponseEntity.ok(
            queryDispatcher.dispatch(new ListarHistoricoStatusLicencaQuery(id)));
    }

    private ActorSnapshot resolveActorSnapshot(Authentication authentication) {
        return actorDisplayResolver.snapshotFrom(currentActorResolver.resolve(authentication));
    }
}
