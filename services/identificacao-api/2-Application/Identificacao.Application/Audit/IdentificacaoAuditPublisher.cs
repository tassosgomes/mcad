using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Identificacao.Application.Audit;

public interface IIdentificacaoAuditPublisher
{
    Task PublishAsync(
        string entityType,
        string entityId,
        IdentificacaoAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        IReadOnlyDictionary<string, object?>? after,
        string? screenId = null,
        string? screenName = null,
        CancellationToken cancellationToken = default);
}

public sealed class IdentificacaoAuditPublisher : IIdentificacaoAuditPublisher
{
    private const int SchemaVersion = 1;
    private const string ServiceName = "identificacao-api";
    private const string SystemName = "mcad";
    private const string SourceSchema = "identificacao";
    private const string EnvironmentName = "local";
    private const string DefaultScreenId = "IDENTIFICACAO";
    private const string DefaultScreenName = "Identificação";

    private readonly IAuditClient _auditClient;
    private readonly IAuditContextProvider _contextProvider;

    public IdentificacaoAuditPublisher(IAuditClient auditClient, IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _contextProvider = contextProvider;
    }

    public async Task PublishAsync(
        string entityType,
        string entityId,
        IdentificacaoAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        IReadOnlyDictionary<string, object?>? after,
        string? screenId = null,
        string? screenName = null,
        CancellationToken cancellationToken = default)
    {
        var ctx = _contextProvider.Current();
        var sId = ValueOrDefault(screenId, DefaultScreenId);
        var sName = ValueOrDefault(screenName, DefaultScreenName);

        var userAction = new AuditEvent(
            Guid.NewGuid().ToString(),
            SchemaVersion,
            EventType.USER_ACTION,
            DateTimeOffset.UtcNow,
            Source(),
            Actor(ctx),
            Origin(ctx, sId, sName),
            Correlation(ctx),
            Data: null,
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason },
            Screen: null,
            Action: new AuditUserAction(
                operation.ActionCode,
                operation.ActionName,
                new Dictionary<string, object?> { ["entityType"] = entityType, ["entityId"] = entityId }));

        await _auditClient.PublishAsync(userAction, cancellationToken);

        var dataAfter = operation.DataAction == DataAction.DELETE ? null : after;
        var changedFields = BuildChangedFields(before, dataAfter);

        var dataChange = new AuditEvent(
            Guid.NewGuid().ToString(),
            SchemaVersion,
            EventType.DATA_CHANGE,
            DateTimeOffset.UtcNow,
            Source(),
            Actor(ctx),
            Origin(ctx, sId, sName),
            Correlation(ctx),
            new AuditData(
                entityType,
                entityId,
                EntityVersion: null,
                operation.DataAction,
                before,
                dataAfter,
                changedFields),
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason });

        await _auditClient.PublishAsync(dataChange, cancellationToken);
    }

    private static AuditSource Source() => new(ServiceName, SystemName, SourceSchema, EnvironmentName);
    private static AuditActor Actor(AuditContext c) => new(c.UserId, c.Username, c.DisplayName, "USER", c.Roles, c.AuthProvider);
    private static AuditOrigin Origin(AuditContext c, string screenId, string screenName) => new(
        ValueOrDefault(c.Channel, "WEB"), c.Ip, c.UserAgent, c.Route,
        ValueOrDefault(c.ScreenId, screenId), ValueOrDefault(c.ScreenName, screenName));
    private static AuditCorrelation Correlation(AuditContext c) =>
        new(c.TraceId, c.RequestId, c.UserSessionId, c.ScreenAccessId, c.CommandId);
    private static AuditSecurityInfo Security() => new("INTERNAL", []);
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
