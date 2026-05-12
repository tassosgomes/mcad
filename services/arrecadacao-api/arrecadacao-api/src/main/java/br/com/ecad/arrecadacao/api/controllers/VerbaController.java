package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.VerbaAgregadoResponse;
import br.com.ecad.arrecadacao.application.dto.VerbaResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarVerbaQuery;
import br.com.ecad.arrecadacao.application.queries.ListarVerbasAgregadasQuery;
import br.com.ecad.arrecadacao.application.queries.ListarVerbasQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;

import jakarta.validation.constraints.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/verbas")
@Validated
public class VerbaController {

    private static final Logger LOGGER = LoggerFactory.getLogger(VerbaController.class);

    private final QueryDispatcher queryDispatcher;

    public VerbaController(QueryDispatcher queryDispatcher) {
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('analista-arrecadacao', 'consultor-arrecadacao')")
    public ResponseEntity<PageResponse<VerbaResponse>> listar(
            @RequestParam(name = "rubricaSigla", required = false) String rubricaSigla,
            @RequestParam(name = "periodo", required = false)
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodo deve estar no formato YYYY-MM")
            String periodo,
            @RequestParam(name = "periodoInicio", required = false)
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodoInicio deve estar no formato YYYY-MM")
            String periodoInicio,
            @RequestParam(name = "periodoFim", required = false)
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodoFim deve estar no formato YYYY-MM")
            String periodoFim,
            @RequestParam(name = "status", required = false) StatusVerba status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", defaultValue = "-periodo") String sort) {
        LOGGER.debug("Listando verbas: rubricaSigla={}, periodo={}, periodoInicio={}, periodoFim={}, status={}, page={}, size={}, sort={}",
                rubricaSigla, periodo, periodoInicio, periodoFim, status, page, size, sort);
        var query = new ListarVerbasQuery(rubricaSigla, periodo, periodoInicio, periodoFim, status, page, size, sort);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @GetMapping("/agregado-por-rubrica")
    @PreAuthorize("hasAnyRole('analista-arrecadacao', 'consultor-arrecadacao')")
    public ResponseEntity<List<VerbaAgregadoResponse>> listarAgregado(
            @RequestParam(name = "periodoInicio", required = false)
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodoInicio deve estar no formato YYYY-MM")
            String periodoInicio,
            @RequestParam(name = "periodoFim", required = false)
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodoFim deve estar no formato YYYY-MM")
            String periodoFim,
            @RequestParam(name = "status", required = false) StatusVerba status) {
        LOGGER.debug("Listando verbas agregadas por rubrica: periodoInicio={}, periodoFim={}, status={}",
                periodoInicio, periodoFim, status);
        var query = new ListarVerbasAgregadasQuery(periodoInicio, periodoFim, status);
        return ResponseEntity.ok(queryDispatcher.dispatch(query));
    }

    @GetMapping("/{rubricaSigla}/{periodo}")
    @PreAuthorize("hasAnyRole('analista-arrecadacao', 'consultor-arrecadacao')")
    public ResponseEntity<VerbaResponse> buscar(
            @PathVariable("rubricaSigla") String rubricaSigla,
            @PathVariable("periodo")
            @Pattern(regexp = "\\d{4}-\\d{2}", message = "periodo deve estar no formato YYYY-MM")
            String periodo) {
        LOGGER.debug("Buscando verba: rubricaSigla={}, periodo={}", rubricaSigla, periodo);
        return ResponseEntity.ok(queryDispatcher.dispatch(new BuscarVerbaQuery(rubricaSigla, periodo)));
    }
}
