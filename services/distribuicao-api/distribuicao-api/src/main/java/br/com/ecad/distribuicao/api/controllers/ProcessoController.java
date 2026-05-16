package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.commands.AprovarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.CancelarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.CriarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.FinalizarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.AprovarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.CancelarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.CriarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.FinalizarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.CancelarProcessoRequest;
import br.com.ecad.distribuicao.application.dto.CriarProcessoRequest;
import br.com.ecad.distribuicao.application.dto.DisponibilidadeResponse;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.queries.BuscarProcessoPorIdQuery;
import br.com.ecad.distribuicao.application.queries.ListarDisponiveisQuery;
import br.com.ecad.distribuicao.application.queries.ListarProcessosQuery;
import br.com.ecad.distribuicao.application.queries.handlers.BuscarProcessoPorIdQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarDisponiveisQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarProcessosQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarProcessosQueryHandler.ProcessoPageResponse;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller para gestão do ciclo de vida dos processos de distribuição.
 *
 * <p>Nota: o endpoint POST /{id}/calcular é tratado pelo {@code ProcessoCalculoController},
 * que executa o cálculo completo (F03). Este controller cobre os demais 8 endpoints do contrato.
 */
@RestController
@RequestMapping("/api/v1/processos")
@SuppressWarnings("null")
public class ProcessoController {

    private final CriarProcessoCommandHandler criarHandler;
    private final AprovarProcessoCommandHandler aprovarHandler;
    private final FinalizarProcessoCommandHandler finalizarHandler;
    private final CancelarProcessoCommandHandler cancelarHandler;
    private final ListarProcessosQueryHandler listarHandler;
    private final BuscarProcessoPorIdQueryHandler buscarHandler;
    private final ListarDisponiveisQueryHandler disponiveisHandler;

    public ProcessoController(
            CriarProcessoCommandHandler criarHandler,
            AprovarProcessoCommandHandler aprovarHandler,
            FinalizarProcessoCommandHandler finalizarHandler,
            CancelarProcessoCommandHandler cancelarHandler,
            ListarProcessosQueryHandler listarHandler,
            BuscarProcessoPorIdQueryHandler buscarHandler,
            ListarDisponiveisQueryHandler disponiveisHandler) {
        this.criarHandler = criarHandler;
        this.aprovarHandler = aprovarHandler;
        this.finalizarHandler = finalizarHandler;
        this.cancelarHandler = cancelarHandler;
        this.listarHandler = listarHandler;
        this.buscarHandler = buscarHandler;
        this.disponiveisHandler = disponiveisHandler;
    }

    @GetMapping("/disponiveis")
    @RequiresPermission("distribuicao:default:processo:listar")
    public ResponseEntity<List<DisponibilidadeResponse>> listarDisponiveis() {
        return ResponseEntity.ok(disponiveisHandler.handle(new ListarDisponiveisQuery()));
    }

    @GetMapping
    @RequiresPermission("distribuicao:default:processo:listar")
    public ResponseEntity<ProcessoPageResponse> listar(
            @RequestParam(required = false) String rubrica,
            @RequestParam(required = false) String periodo,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(listarHandler.handle(
                new ListarProcessosQuery(rubrica, periodo, status, page, size)));
    }

    @GetMapping("/{id}")
    @RequiresPermission("distribuicao:default:processo:visualizar")
    public ResponseEntity<ProcessoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(buscarHandler.handle(new BuscarProcessoPorIdQuery(id)));
    }

    @PostMapping
    @RequiresPermission("distribuicao:default:processo:criar")
    public ResponseEntity<ProcessoResponse> criar(
            @Valid @RequestBody CriarProcessoRequest request,
            Authentication auth) {
        var analista = auth != null ? auth.getName() : "system";
        var cmd = new CriarProcessoCommand(request.rubricaSigla(), request.periodo(), analista);
        return ResponseEntity.status(HttpStatus.CREATED).body(criarHandler.handle(cmd));
    }

    @PostMapping("/{id}/aprovar")
    @RequiresPermission("distribuicao:default:processo:aprovar")
    public ResponseEntity<ProcessoResponse> aprovar(
            @PathVariable UUID id,
            Authentication auth) {
        var autor = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(aprovarHandler.handle(new AprovarProcessoCommand(id, autor)));
    }

    @PostMapping("/{id}/finalizar")
    @RequiresPermission("distribuicao:default:processo:finalizar")
    public ResponseEntity<ProcessoResponse> finalizar(
            @PathVariable UUID id,
            Authentication auth) {
        var autor = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(finalizarHandler.handle(new FinalizarProcessoCommand(id, autor)));
    }

    @PostMapping("/{id}/cancelar")
    @RequiresPermission("distribuicao:default:processo:cancelar")
    public ResponseEntity<ProcessoResponse> cancelar(
            @PathVariable UUID id,
            @Valid @RequestBody CancelarProcessoRequest request,
            Authentication auth) {
        var autor = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(cancelarHandler.handle(
                new CancelarProcessoCommand(id, request.justificativa(), autor)));
    }
}
