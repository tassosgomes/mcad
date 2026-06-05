package br.com.ecad.distribuicao.api.controllers;

import br.com.ecad.distribuicao.application.dto.DashboardResumoResponse;
import br.com.ecad.distribuicao.application.queries.handlers.GetDashboardResumoQueryHandler;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller de resumo da dashboard para o domínio de Distribuição.
 * Retorna métricas agregadas para alimentar o widget da home.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final GetDashboardResumoQueryHandler handler;

    public DashboardController(GetDashboardResumoQueryHandler handler) {
        this.handler = handler;
    }

    @GetMapping("/resumo")
    @RequiresPermission("distribuicao:default:rubrica:listar")
    public ResponseEntity<DashboardResumoResponse> resumo() {
        return ResponseEntity.ok(handler.handle());
    }
}
