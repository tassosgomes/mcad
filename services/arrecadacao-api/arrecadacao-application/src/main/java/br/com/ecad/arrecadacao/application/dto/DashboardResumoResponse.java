package br.com.ecad.arrecadacao.application.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resposta do resumo da dashboard para o domínio de Arrecadação.
 * Retorna métricas agregadas de licenças, verbas e pagamentos.
 */
public record DashboardResumoResponse(
        BigDecimal arrecadacaoMes,
        long totalLicencasAtivas,
        long totalLicencasSuspensas,
        BigDecimal verbaLiquidaEstimada,
        List<DashboardAlerta> alertas) {

    public record DashboardAlerta(String tipo, String mensagem) {}
}
