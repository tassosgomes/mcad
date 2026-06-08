package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.dto.AjusteEstornoDetalheResponse;
import br.com.ecad.distribuicao.application.dto.AjusteEstornoPageResponse;
import br.com.ecad.distribuicao.application.queries.BuscarAjusteEstornoPorIdQuery;
import br.com.ecad.distribuicao.application.queries.ListarAjustesEstornoQuery;
import br.com.ecad.distribuicao.application.queries.handlers.BuscarAjusteEstornoPorIdQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarAjustesEstornoQueryHandler;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ajustes-estorno")
public class AjusteEstornoController {

    private final ListarAjustesEstornoQueryHandler listarHandler;
    private final BuscarAjusteEstornoPorIdQueryHandler buscarHandler;

    public AjusteEstornoController(
            ListarAjustesEstornoQueryHandler listarHandler,
            BuscarAjusteEstornoPorIdQueryHandler buscarHandler) {
        this.listarHandler = listarHandler;
        this.buscarHandler = buscarHandler;
    }

    @GetMapping
    @RequiresPermission("distribuicao:default:ajuste:listar")
    public ResponseEntity<AjusteEstornoPageResponse> listar(
            @RequestParam(required = false) String rubrica,
            @RequestParam(required = false) String periodoOrigem,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID pagamentoId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {

        List<StatusAjusteEstorno> statusList = status == null ? null
                : Arrays.stream(status.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(StatusAjusteEstorno::valueOf)
                        .toList();

        var result = listarHandler.handle(
                new ListarAjustesEstornoQuery(rubrica, periodoOrigem, statusList, pagamentoId, page, size, sort));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @RequiresPermission("distribuicao:default:ajuste:visualizar")
    public ResponseEntity<AjusteEstornoDetalheResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(buscarHandler.handle(new BuscarAjusteEstornoPorIdQuery(id)));
    }
}
