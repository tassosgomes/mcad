using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Solicitacoes.Responses;

namespace Cadastro.Application.Solicitacoes.Queries;

/// <summary>
/// Lista todas as solicitações de alteração para o painel do Analista (RF-16, RF-18, RF-19).
/// <para>
/// Diferente de <c>ListarMinhasSolicitacoesQuery</c>, esta query não restringe por
/// <c>TitularId</c> — o Analista vê todas as solicitações de todos os titulares.
/// Filtros opcionais: <c>Status</c> (SCREAMING_SNAKE_CASE), <c>TitularId</c>, <c>Campo</c>.
/// </para>
/// </summary>
public record ListarSolicitacoesQuery(
    string? Status = null,
    Guid? TitularId = null,
    string? Campo = null,
    int Page = 1,
    int Size = 20) : IQuery<SolicitacaoListResponse>;
