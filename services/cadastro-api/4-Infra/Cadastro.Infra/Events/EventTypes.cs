namespace Cadastro.Infra.Events;

/// <summary>
/// Constantes para os 8 tipos de evento publicados pelo domínio Cadastro.
/// Segue o padrão: cadastro.{entidade}.{acao}
/// O valor é usado como routing key no RabbitMQ (exchange: cadastro.events, tipo: topic).
/// </summary>
public static class EventTypes
{
    // ── Obra Musical ──────────────────────────────────────────────────────────
    public const string ObraLiberada      = "cadastro.obra.liberada";
    public const string ObraBloqueada     = "cadastro.obra.bloqueada";
    public const string ObraDominioPublico = "cadastro.obra.dominio-publico";
    public const string ObraDepurada      = "cadastro.obra.depurada";

    // ── Fonograma ─────────────────────────────────────────────────────────────
    public const string FonogramaLiberado  = "cadastro.fonograma.liberado";
    public const string FonogramaDepurado  = "cadastro.fonograma.depurado";
    public const string FonogramaBloqueado = "cadastro.fonograma.bloqueado";

    // ── Titular ───────────────────────────────────────────────────────────────
    public const string TitularCriado = "cadastro.titular.criado";
}
