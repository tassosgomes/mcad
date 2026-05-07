using Cadastro.Domain.Entities;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class ObraAuditEventFactory
{
    private const int SchemaVersion = 1;
    private const string ServiceName = "cadastro-api";
    private const string SystemName = "mcad";
    private const string SourceSchema = "cadastro";
    private const string EnvironmentName = "local";
    private const string EntityType = "ObraMusical";
    private const string ScreenId = "CADASTRO_OBRAS";
    private const string ScreenName = "Obras";

    public AuditEvent UserAction(ObraMusical obra, AuditContext context, ObraAuditOperation operation)
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
                BusinessContext(obra)));
    }

    public AuditEvent DataChange(
        ObraMusical obra,
        AuditContext context,
        ObraAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before)
    {
        var after = operation.DataAction == DataAction.DELETE ? null : ObraMap(obra);
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
                obra.Id.ToString(),
                EntityVersion: null,
                operation.DataAction,
                before,
                after,
                changedFields),
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason });
    }

    public IReadOnlyDictionary<string, object?> ObraMap(ObraMusical obra)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = obra.Id.ToString(),
            ["codigo"] = obra.Codigo,
            ["titulo"] = obra.Titulo,
            ["subtitulo"] = obra.Subtitulo,
            ["tipo"] = obra.Tipo.ToString().ToUpperInvariant(),
            ["genero"] = obra.Genero,
            ["iswc"] = obra.Iswc,
            ["status"] = obra.Status.ToString().ToUpperInvariant(),
            ["dominioPublico"] = obra.DominioPublico,
            ["obraDepuradaParaId"] = obra.ObraDepuradaParaId?.ToString(),
            ["bloqueioJustificativa"] = obra.BloqueioJustificativa,
            ["criadoEm"] = obra.CriadoEm,
            ["atualizadoEm"] = obra.AtualizadoEm
        };
    }

    private static AuditSource Source()
    {
        return new AuditSource(ServiceName, SystemName, SourceSchema, EnvironmentName);
    }

    private static AuditActor Actor(AuditContext context)
    {
        return new AuditActor(
            context.UserId,
            context.Username,
            context.DisplayName,
            "USER",
            context.Roles,
            context.AuthProvider);
    }

    private static AuditOrigin Origin(AuditContext context)
    {
        return new AuditOrigin(
            ValueOrDefault(context.Channel, "WEB"),
            context.Ip,
            context.UserAgent,
            context.Route,
            ValueOrDefault(context.ScreenId, ScreenId),
            ValueOrDefault(context.ScreenName, ScreenName));
    }

    private static AuditCorrelation Correlation(AuditContext context)
    {
        return new AuditCorrelation(
            context.TraceId,
            context.RequestId,
            context.UserSessionId,
            context.ScreenAccessId,
            context.CommandId);
    }

    private static AuditSecurityInfo Security()
    {
        return new AuditSecurityInfo("INTERNAL", []);
    }

    private static Dictionary<string, object?> BusinessContext(ObraMusical obra)
    {
        return new Dictionary<string, object?>
        {
            ["entityType"] = EntityType,
            ["entityId"] = obra.Id.ToString()
        };
    }

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

    private static string ValueOrDefault(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
