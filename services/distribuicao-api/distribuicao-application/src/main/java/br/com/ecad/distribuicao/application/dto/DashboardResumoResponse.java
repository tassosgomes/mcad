package br.com.ecad.distribuicao.application.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resposta do resumo da dashboard para o domínio de Distribuição.
 * Retorna métricas do último ciclo de distribuição e contagem de rubricas.
 */
public record DashboardResumoResponse(
        String statusUltimoCiclo,
        BigDecimal totalRepassado,
        BigDecimal creditosRetidos,
        int rubricasAtivas,
        List<DashboardAlerta> alertas) {

    public record DashboardAlerta(String tipo, String mensagem) {}
}
