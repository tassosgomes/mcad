package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.dto.DemonstrativoTitularResponse;
import br.com.ecad.distribuicao.application.dto.TitularesDemonstrativoPageResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarDemonstrativoTitularQuery;
import br.com.ecad.distribuicao.application.queries.ListarTitularesDemonstrativoQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ConsultarDemonstrativoTitularQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarTitularesDemonstrativoQueryHandler;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/processos")
@SuppressWarnings("null")
public class DemonstrativoController {

    private final ListarTitularesDemonstrativoQueryHandler listarHandler;
    private final ConsultarDemonstrativoTitularQueryHandler consultarHandler;

    public DemonstrativoController(
            ListarTitularesDemonstrativoQueryHandler listarHandler,
            ConsultarDemonstrativoTitularQueryHandler consultarHandler) {
        this.listarHandler = listarHandler;
        this.consultarHandler = consultarHandler;
    }

    @GetMapping("/{id}/demonstrativos")
    @RequiresPermission("distribuicao:default:demonstrativo:listar")
    public ResponseEntity<TitularesDemonstrativoPageResponse> listarTitulares(
            @PathVariable UUID id,
            @RequestParam(required = false) String titularNome,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nome") String sort) {

        if (size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Parametro 'size' nao pode exceder 100");
        }

        var query = new ListarTitularesDemonstrativoQuery(id, titularNome, page, size, sort);
        return ResponseEntity.ok(listarHandler.handle(query));
    }

    @GetMapping("/{id}/demonstrativos/{titularId}")
    @RequiresPermission("distribuicao:default:demonstrativo:visualizar")
    public ResponseEntity<DemonstrativoTitularResponse> consultarDemonstrativo(
            @PathVariable UUID id,
            @PathVariable UUID titularId) {

        var query = new ConsultarDemonstrativoTitularQuery(id, titularId);
        return ResponseEntity.ok(consultarHandler.handle(query));
    }
}
