using Prometheus;

namespace Cadastro.Application.Portal.Metrics;

public static class PortalMetrics
{
    public static readonly Counter LoginAttempts = Prometheus.Metrics.CreateCounter(
        "portal_login_attempts_total",
        "Total de tentativas de login no Portal do Titular",
        new CounterConfiguration
        {
            LabelNames = ["result"]
        });

    public static readonly Counter OcorrenciasAbertas = Prometheus.Metrics.CreateCounter(
        "portal_ocorrencias_abertas_total",
        "Total de ocorrências abertas via Portal do Titular");

    public static readonly Counter SolicitacoesAprovadas = Prometheus.Metrics.CreateCounter(
        "portal_solicitacoes_aprovadas_total",
        "Total de solicitações de alteração aprovadas pelo Analista");

    public static void IncrementLoginAttempt(string result) =>
        LoginAttempts.WithLabels(result).Inc();

    public static void IncrementOcorrenciaAberta() =>
        OcorrenciasAbertas.Inc();

    public static void IncrementSolicitacaoAprovada() =>
        SolicitacoesAprovadas.Inc();
}
