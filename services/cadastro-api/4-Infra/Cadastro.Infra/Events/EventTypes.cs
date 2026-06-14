using Cadastro.Domain.Enums;

namespace Cadastro.Infra.Events;

/// <summary>
/// Constantes para os tipos de evento publicados pelo domínio Cadastro.
/// Segue o padrão: cadastro.{entidade}.{acao}
/// O valor é usado como routing key no RabbitMQ (exchange: cadastro.events, tipo: topic).
/// </summary>
public static class EventTypes
{
    // ── Obra Musical ──────────────────────────────────────────────────────────
    public const string ObraLiberada       = "cadastro.obra.liberada";
    public const string ObraBloqueada      = "cadastro.obra.bloqueada";
    public const string ObraDominioPublico = "cadastro.obra.dominio-publico";
    public const string ObraDepurada       = "cadastro.obra.depurada";

    // ── Fonograma ─────────────────────────────────────────────────────────────
    public const string FonogramaLiberado  = "cadastro.fonograma.liberado";
    public const string FonogramaDepurado  = "cadastro.fonograma.depurado";
    public const string FonogramaBloqueado = "cadastro.fonograma.bloqueado";

    // ── Titular ───────────────────────────────────────────────────────────────
    public const string TitularCriado = "cadastro.titular.criado";

    // ── Anexos ────────────────────────────────────────────────────────────────
    public const string ObraAnexoAdicionado        = "cadastro.obra.anexo.adicionado";
    public const string ObraAnexoRemovido          = "cadastro.obra.anexo.removido";
    public const string FonogramaAnexoAdicionado   = "cadastro.fonograma.anexo.adicionado";
    public const string FonogramaAnexoRemovido     = "cadastro.fonograma.anexo.removido";
    public const string TitularAnexoAdicionado     = "cadastro.titular.anexo.adicionado";
    public const string TitularAnexoRemovido       = "cadastro.titular.anexo.removido";

    public static string AnexoAdicionado(TipoEntidadeAnexo tipo) => tipo switch
    {
        TipoEntidadeAnexo.Obra      => ObraAnexoAdicionado,
        TipoEntidadeAnexo.Fonograma => FonogramaAnexoAdicionado,
        TipoEntidadeAnexo.Titular   => TitularAnexoAdicionado,
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };

    public static string AnexoRemovido(TipoEntidadeAnexo tipo) => tipo switch
    {
        TipoEntidadeAnexo.Obra      => ObraAnexoRemovido,
        TipoEntidadeAnexo.Fonograma => FonogramaAnexoRemovido,
        TipoEntidadeAnexo.Titular   => TitularAnexoRemovido,
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };
}
