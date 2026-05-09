using Cadastro.Domain.Entities;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class FonogramaAuditEventFactory
{
    private const int SchemaVersion = 1;
    private const string ServiceName = "cadastro-api";
    private const string SystemName = "mcad";
    private const string SourceSchema = "cadastro";
    private const string EnvironmentName = "local";
    private const string EntityType = "Fonograma";
    private const string ScreenId = "CADASTRO_FONOGRAMAS";
    private const string ScreenName = "Fonogramas";

    public AuditEvent UserAction(Fonograma fonograma, AuditContext context, FonogramaAuditOperation operation)
    {
        return new AuditEvent(
            Guid.NewGuid().ToString(),
            SchemaVersion,
            EventType.USER_ACTION,
            DateTimeOffset.UtcNow,
            Source(),
            Actor(context),
            Origin(context),
            Correlation(context),
            Data: null,
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason },
            Screen: null,
            Action: new AuditUserAction(
                operation.ActionCode,
                operation.ActionName,
                BusinessContext(fonograma)));
    }

    public AuditEvent DataChange(
        Fonograma fonograma,
        AuditContext context,
        FonogramaAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before)
    {
        var after = operation.DataAction == DataAction.DELETE ? null : FonogramaMap(fonograma);
        var changedFields = BuildChangedFields(before, after);

        return new AuditEvent(
            Guid.NewGuid().ToString(),
            SchemaVersion,
            EventType.DATA_CHANGE,
            DateTimeOffset.UtcNow,
            Source(),
            Actor(context),
            Origin(context),
            Correlation(context),
            new AuditData(
                EntityType,
                fonograma.Id.ToString(),
                EntityVersion: null,
                operation.DataAction,
                before,
                after,
                changedFields),
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason });
    }

    public IReadOnlyDictionary<string, object?> FonogramaMap(Fonograma fonograma)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = fonograma.Id.ToString(),
            ["codigo"] = fonograma.Codigo,
            ["isrc"] = fonograma.Isrc?.Valor,
            ["isrcFormatado"] = fonograma.Isrc?.Formatado,
            ["obraId"] = fonograma.ObraId.ToString(),
            ["paisOrigem"] = fonograma.PaisOrigem,
            ["dataGravacao"] = fonograma.DataGravacao?.ToString("yyyy-MM-dd"),
            ["dataLancamento"] = fonograma.DataLancamento?.ToString("yyyy-MM-dd"),
            ["status"] = fonograma.Status.ToString().ToUpperInvariant(),
            ["urlAudio"] = fonograma.UrlAudio,
            ["bloqueioJustificativa"] = fonograma.BloqueioJustificativa,
            ["fonogramaDepuradoParaId"] = fonograma.FonogramaDepuradoParaId?.ToString(),
            ["criadoEm"] = fonograma.CriadoEm,
            ["atualizadoEm"] = fonograma.AtualizadoEm
        };
    }

    private static AuditSource Source() =>
        new(ServiceName, SystemName, SourceSchema, EnvironmentName);

    private static AuditActor Actor(AuditContext context) =>
        new(context.UserId, context.Username, context.DisplayName, "USER", context.Roles, context.AuthProvider);

    private static AuditOrigin Origin(AuditContext context) =>
        new(
            ValueOrDefault(context.Channel, "WEB"),
            context.Ip,
            context.UserAgent,
            context.Route,
            ValueOrDefault(context.ScreenId, ScreenId),
            ValueOrDefault(context.ScreenName, ScreenName));

    private static AuditCorrelation Correlation(AuditContext context) =>
        new(context.TraceId, context.RequestId, context.UserSessionId, context.ScreenAccessId, context.CommandId);

    private static AuditSecurityInfo Security() => new("INTERNAL", []);

    private static Dictionary<string, object?> BusinessContext(Fonograma fonograma) =>
        new()
        {
            ["entityType"] = EntityType,
            ["entityId"] = fonograma.Id.ToString()
        };

    private static IReadOnlyList<AuditChangedField> BuildChangedFields(
        IReadOnlyDictionary<string, object?>? before,
        IReadOnlyDictionary<string, object?>? after)
    {
        if (before is null || after is null)
        {
            return [];
        }

        return after
            .Where(item => !Equals(before.GetValueOrDefault(item.Key), item.Value))
            .Select(item => new AuditChangedField(item.Key, before.GetValueOrDefault(item.Key), item.Value))
            .ToArray();
    }

    private static string ValueOrDefault(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value;
}
