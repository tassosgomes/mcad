using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de abertura de solicitação de alteração de dado sensível pelo titular autenticado
/// (RF-14, RF-15, RF-20, RF-21).
/// <para>
/// <c>TitularId</c> vem do <c>ICurrentTitular</c> (extraído do JWT), não do body —
/// anti-tampering: um titular não pode abrir solicitações em nome de outro.
/// </para>
/// <para>
/// <c>Campo</c> é a string SCREAMING_SNAKE_CASE do enum <c>CampoSolicitacao</c>
/// (<c>NOME</c>, <c>CAE_IPI</c>, <c>ASSOCIACAO</c>, <c>CATEGORIA</c>).
/// <c>ValorPretendido</c> é obrigatório; quando <c>Campo == ASSOCIACAO</c> deve ser o GUID da
/// nova associação (RF-20: vínculo só pode ser alterado, jamais removido — validado em domínio).
/// <c>Justificativa</c> mínimo 10 caracteres (texto livre do titular explicando o motivo).
/// </para>
/// </summary>
public record AbrirSolicitacaoCommand(
    Guid TitularId,
    string Campo,
    string ValorPretendido,
    string Justificativa) : ICommand<SolicitacaoResponse>;
