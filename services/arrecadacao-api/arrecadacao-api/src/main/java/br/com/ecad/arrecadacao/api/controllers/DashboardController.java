package br.com.ecad.arrecadacao.api.controllers;

import br.com.ecad.arrecadacao.application.cqrs.QueryDispatcher;
import br.com.ecad.arrecadacao.application.dto.DashboardResumoResponse;
import br.com.ecad.arrecadacao.application.queries.GetDashboardResumoQuery;
import br.org.ecad.authz.sdk.annotation.RequiresPermission;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller de resumo da dashboard para o domínio de Arrecadação.
 * Retorna métricas agregadas para alimentar o widget da home.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final QueryDispatcher queryDispatcher;

    public DashboardController(QueryDispatcher queryDispatcher) {
        this.queryDispatcher = queryDispatcher;
    }

    @GetMapping("/resumo")
    @RequiresPermission("arrecadacao:default:cliente:listar")
    public ResponseEntity<DashboardResumoResponse> resumo() {
        return ResponseEntity.ok(queryDispatcher.dispatch(new GetDashboardResumoQuery()));
    }
}
