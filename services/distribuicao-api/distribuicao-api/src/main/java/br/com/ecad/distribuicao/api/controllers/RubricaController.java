package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.dto.RubricaResponse;
import br.com.ecad.distribuicao.application.queries.BuscarRubricaPorSiglaQuery;
import br.com.ecad.distribuicao.application.queries.ListarRubricasQuery;
import br.com.ecad.distribuicao.application.queries.handlers.BuscarRubricaPorSiglaQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarRubricasQueryHandler;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rubricas")
public class RubricaController {

    private final ListarRubricasQueryHandler listarRubricasQueryHandler;
    private final BuscarRubricaPorSiglaQueryHandler buscarRubricaPorSiglaQueryHandler;

    public RubricaController(
            ListarRubricasQueryHandler listarRubricasQueryHandler,
            BuscarRubricaPorSiglaQueryHandler buscarRubricaPorSiglaQueryHandler) {
        this.listarRubricasQueryHandler = listarRubricasQueryHandler;
        this.buscarRubricaPorSiglaQueryHandler = buscarRubricaPorSiglaQueryHandler;
    }

    @GetMapping
    @RequiresPermission("distribuicao:default:rubrica:listar")
    public ResponseEntity<List<RubricaResponse>> listar() {
        return ResponseEntity.ok(listarRubricasQueryHandler.handle(new ListarRubricasQuery()));
    }

    @GetMapping("/{sigla}")
    @RequiresPermission("distribuicao:default:rubrica:visualizar")
    public ResponseEntity<RubricaResponse> buscarPorSigla(@PathVariable String sigla) {
        return ResponseEntity.ok(
                buscarRubricaPorSiglaQueryHandler.handle(new BuscarRubricaPorSiglaQuery(sigla)));
    }
}
