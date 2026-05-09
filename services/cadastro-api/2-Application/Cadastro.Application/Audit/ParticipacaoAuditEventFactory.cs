using Cadastro.Domain.Entities;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class ParticipacaoAuditEventFactory
{
    private const int SchemaVersion = 1;
    private const string ServiceName = "cadastro-api";
    private const string SystemName = "mcad";
    private const string SourceSchema = "cadastro";
    private const string EnvironmentName = "local";
    private const string EntityType = "ParticipacaoConexa";
    private const string ScreenId = "CADASTRO_FONOGRAMAS";
    private const string ScreenName = "Fonogramas";

    public AuditEvent UserAction(ParticipacaoConexa p, AuditContext context, ParticipacaoAuditOperation operation) =>
        new(
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
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason, ["fonogramaId"] = p.FonogramaId.ToString() },
            Screen: null,
            Action: new AuditUserAction(
                operation.ActionCode,
                operation.ActionName,
                BusinessContext(p)));

    public AuditEvent DataChange(
        ParticipacaoConexa p,
        AuditContext context,
        ParticipacaoAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before)
    {
        var after = operation.DataAction == DataAction.DELETE ? null : Map(p);
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
                p.Id.ToString(),
                EntityVersion: null,
                operation.DataAction,
                before,
                after,
                changedFields),
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason, ["fonogramaId"] = p.FonogramaId.ToString() });
    }

    public IReadOnlyDictionary<string, object?> Map(ParticipacaoConexa p) =>
        new Dictionary<string, object?>
        {
            ["id"] = p.Id.ToString(),
            ["fonogramaId"] = p.FonogramaId.ToString(),
            ["titularId"] = p.TitularId.ToString(),
            ["categoria"] = p.Categoria.ToString().ToUpperInvariant(),
            ["percentual"] = p.Percentual,
            ["criadoEm"] = p.CriadoEm
        };

    private static AuditSource Source() => new(ServiceName, SystemName, SourceSchema, EnvironmentName);
    private static AuditActor Actor(AuditContext c) => new(c.UserId, c.Username, c.DisplayName, "USER", c.Roles, c.AuthProvider);
    private static AuditOrigin Origin(AuditContext c) => new(
        ValueOrDefault(c.Channel, "WEB"), c.Ip, c.UserAgent, c.Route,
        ValueOrDefault(c.ScreenId, ScreenId), ValueOrDefault(c.ScreenName, ScreenName));
    private static AuditCorrelation Correlation(AuditContext c) =>
        new(c.TraceId, c.RequestId, c.UserSessionId, c.ScreenAccessId, c.CommandId);
    private static AuditSecurityInfo Security() => new("INTERNAL", []);
    private static Dictionary<string, object?> BusinessContext(ParticipacaoConexa p) =>
        new() { ["entityType"] = EntityType, ["entityId"] = p.Id.ToString(), ["fonogramaId"] = p.FonogramaId.ToString() };
    private static IReadOnlyList<AuditChangedField> BuildChangedFields(
        IReadOnlyDictionary<string, object?>? before,
        IReadOnlyDictionary<string, object?>? after)
    {
        if (before is null || after is null) return [];
        return after
            .Where(item => !Equals(before.GetValueOrDefault(item.Key), item.Value))
            .Select(item => new AuditChangedField(item.Key, before.GetValueOrDefault(item.Key), item.Value))
            .ToArray();
    }
    private static string ValueOrDefault(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value;
}
