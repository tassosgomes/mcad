using Ecad.Audit.Contract;

namespace Identificacao.Application.Audit;

public sealed record IdentificacaoAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    // Captação
    public static readonly IdentificacaoAuditOperation CaptacaoCreate = new(
        "CADASTRAR_CAPTACAO", "Cadastrar captação", "Captação cadastrada", DataAction.CREATE);
    public static readonly IdentificacaoAuditOperation CaptacaoUpdate = new(
        "ATUALIZAR_CAPTACAO", "Atualizar captação", "Captação atualizada", DataAction.UPDATE);
    public static readonly IdentificacaoAuditOperation CaptacaoDelete = new(
        "EXCLUIR_CAPTACAO", "Excluir captação", "Captação excluída", DataAction.DELETE);
    public static readonly IdentificacaoAuditOperation CaptacaoFechar = new(
        "FECHAR_ROL_CAPTACAO", "Fechar rol da captação", "Rol da captação fechado", DataAction.UPDATE);

    // Upload
    public static readonly IdentificacaoAuditOperation UploadCreate = new(
        "CRIAR_UPLOAD_CSV", "Criar upload CSV", "Upload CSV iniciado", DataAction.CREATE);

    // Execução
    public static readonly IdentificacaoAuditOperation ExecucaoCreate = new(
        "CADASTRAR_EXECUCAO", "Cadastrar execução", "Execução cadastrada", DataAction.CREATE);
    public static readonly IdentificacaoAuditOperation ExecucaoUpdate = new(
        "ATUALIZAR_EXECUCAO", "Atualizar execução", "Execução atualizada", DataAction.UPDATE);
    public static readonly IdentificacaoAuditOperation ExecucaoDelete = new(
        "EXCLUIR_EXECUCAO", "Excluir execução", "Execução excluída", DataAction.DELETE);

    // Pendente
    public static readonly IdentificacaoAuditOperation PendenteResolve = new(
        "RESOLVER_PENDENTE", "Resolver pendente", "Execução pendente resolvida", DataAction.UPDATE);
    public static readonly IdentificacaoAuditOperation PendenteResolveLote = new(
        "RESOLVER_PENDENTES_LOTE", "Resolver pendentes em lote", "Execuções pendentes resolvidas em lote", DataAction.UPDATE);
}
