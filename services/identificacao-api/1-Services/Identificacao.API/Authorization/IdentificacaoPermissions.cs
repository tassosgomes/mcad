namespace Identificacao.API.Authorization;

/// <summary>
/// Catálogo de permissões finas do serviço Identificação.
/// Padrão: <c>identificacao:default:&lt;recurso&gt;:&lt;acao&gt;</c>.
/// As constantes são usadas diretamente em <c>RequireIdentificacaoPermission</c>
/// nos endpoints e refletem o catálogo documentado em
/// <c>docs/authz/catalog/identificacao.md</c>.
/// </summary>
public static class IdentificacaoPermissions
{
    // ── Captação (rol de captação musical) ───────────────────────────────
    public const string CaptacaoListar = "identificacao:default:captacao:listar";
    public const string CaptacaoVisualizar = "identificacao:default:captacao:visualizar";
    public const string CaptacaoCriar = "identificacao:default:captacao:criar";
    public const string CaptacaoEditar = "identificacao:default:captacao:editar";
    public const string CaptacaoExcluir = "identificacao:default:captacao:excluir";
    public const string CaptacaoCancelar = "identificacao:default:captacao:cancelar";
    public const string CaptacaoFechar = "identificacao:default:captacao:fechar";
    public const string CaptacaoManutencao = "identificacao:default:captacao:manutencao";

    // ── Execução musical dentro de uma captação ──────────────────────────
    public const string ExecucaoListar = "identificacao:default:execucao:listar";
    public const string ExecucaoCriar = "identificacao:default:execucao:criar";
    public const string ExecucaoEditar = "identificacao:default:execucao:editar";
    public const string ExecucaoExcluir = "identificacao:default:execucao:excluir";

    // ── Analista (responsáveis de captação) ───────────────────────────────
    public const string AnalistaListar = "identificacao:default:analista:listar";

    // ── Rubrica e tipo de utilização (cadastros auxiliares) ──────────────
    public const string RubricaListar = "identificacao:default:rubrica:listar";
    public const string TipoUtilizacaoListar = "identificacao:default:tipo-utilizacao:listar";

    // ── Upload de CSV (importação em lote de execuções) ──────────────────
    public const string UploadListar = "identificacao:default:upload:listar";
    public const string UploadVisualizar = "identificacao:default:upload:visualizar";
    public const string UploadVisualizarErros = "identificacao:default:upload:visualizar-erros";
    public const string UploadImportar = "identificacao:default:upload:importar";

    // ── Usuário de Música (projeção local da Arrecadação) ────────────────
    public const string UsuarioMusicaListar = "identificacao:default:usuario-musica:listar";

    // ── Pendentes (execuções sem obra/fonograma identificado) ────────────
    public const string PendenteListar = "identificacao:default:pendente:listar";
    public const string PendenteVisualizarImpacto = "identificacao:default:pendente:visualizar-impacto";
    public const string PendenteResolver = "identificacao:default:pendente:resolver";
}
