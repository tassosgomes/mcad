package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.commands.CalcularProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.CalcularProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.CalcularProcessoResponse;
import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarCalculoProcessoQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ConsultarCalculoProcessoQueryHandler;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/processos/{id}")
public class ProcessoCalculoController {

    private final CalcularProcessoCommandHandler calcularProcessoCommandHandler;
    private final ConsultarCalculoProcessoQueryHandler consultarCalculoProcessoQueryHandler;

    public ProcessoCalculoController(
            CalcularProcessoCommandHandler calcularProcessoCommandHandler,
            ConsultarCalculoProcessoQueryHandler consultarCalculoProcessoQueryHandler) {
        this.calcularProcessoCommandHandler = calcularProcessoCommandHandler;
        this.consultarCalculoProcessoQueryHandler = consultarCalculoProcessoQueryHandler;
    }

    @PostMapping("/calcular")
    @PreAuthorize("hasAuthority('ROLE_analista-distribuicao') or hasAuthority('SCOPE_write')")
    public ResponseEntity<CalcularProcessoResponse> calcular(
            @PathVariable UUID id,
            Principal principal,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        return ResponseEntity.ok(calcularProcessoCommandHandler.handle(new CalcularProcessoCommand(
                id,
                principal == null ? "" : principal.getName(),
                authorizationHeader)));
    }

    @GetMapping("/calculo")
    @PreAuthorize("""
            hasAuthority('ROLE_analista-distribuicao')
            or hasAuthority('ROLE_consultor-distribuicao')
            or hasAuthority('SCOPE_access')
            or hasAuthority('SCOPE_write')
            """)
    public ResponseEntity<CalculoProcessoResponse> consultar(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) UUID titularId,
            @RequestParam(required = false) UUID obraId) {
        return ResponseEntity.ok(consultarCalculoProcessoQueryHandler.handle(new ConsultarCalculoProcessoQuery(
                id,
                page,
                size,
                categoria,
                titularId,
                obraId)));
    }
}
