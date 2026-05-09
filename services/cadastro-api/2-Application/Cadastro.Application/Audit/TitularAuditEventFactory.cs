using Cadastro.Domain.Entities;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class TitularAuditEventFactory
{
    private const int SchemaVersion = 1;
    private const string ServiceName = "cadastro-api";
    private const string SystemName = "mcad";
    private const string SourceSchema = "cadastro";
    private const string EnvironmentName = "local";
    private const string EntityType = "Titular";
    private const string ScreenId = "CADASTRO_TITULARES";
    private const string ScreenName = "Titulares";

    public AuditEvent UserAction(Titular titular, AuditContext context, TitularAuditOperation operation) =>
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
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason },
            Screen: null,
            Action: new AuditUserAction(
                operation.ActionCode,
                operation.ActionName,
                BusinessContext(titular)));

    public AuditEvent DataChange(
        Titular titular,
        AuditContext context,
        TitularAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before)
    {
        var after = operation.DataAction == DataAction.DELETE ? null : TitularMap(titular);
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
                titular.Id.ToString(),
                EntityVersion: null,
                operation.DataAction,
                before,
                after,
                changedFields),
            Security(),
            Metadata: new Dictionary<string, object?> { ["reason"] = operation.Reason });
    }

    public IReadOnlyDictionary<string, object?> TitularMap(Titular titular) =>
        new Dictionary<string, object?>
        {
            ["id"] = titular.Id.ToString(),
            ["codigo"] = titular.Codigo,
            ["nome"] = titular.Nome,
            ["tipo"] = titular.Tipo.ToString().ToUpperInvariant(),
            ["cpf"] = titular.Cpf?.Valor,
            ["cnpj"] = titular.Cnpj?.Valor,
            ["nacionalidade"] = titular.Nacionalidade,
            ["caeIpi"] = titular.CaeIpi?.Valor,
            ["associacaoId"] = titular.AssociacaoId.ToString(),
            ["status"] = titular.Status.ToString().ToUpperInvariant(),
            ["criadoEm"] = titular.CriadoEm,
            ["atualizadoEm"] = titular.AtualizadoEm
        };

    private static AuditSource Source() => new(ServiceName, SystemName, SourceSchema, EnvironmentName);
    private static AuditActor Actor(AuditContext c) => new(c.UserId, c.Username, c.DisplayName, "USER", c.Roles, c.AuthProvider);
    private static AuditOrigin Origin(AuditContext c) => new(
        ValueOrDefault(c.Channel, "WEB"), c.Ip, c.UserAgent, c.Route,
        ValueOrDefault(c.ScreenId, ScreenId), ValueOrDefault(c.ScreenName, ScreenName));
    private static AuditCorrelation Correlation(AuditContext c) =>
        new(c.TraceId, c.RequestId, c.UserSessionId, c.ScreenAccessId, c.CommandId);
    private static AuditSecurityInfo Security() => new("INTERNAL", []);
    private static Dictionary<string, object?> BusinessContext(Titular t) =>
        new() { ["entityType"] = EntityType, ["entityId"] = t.Id.ToString() };
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
