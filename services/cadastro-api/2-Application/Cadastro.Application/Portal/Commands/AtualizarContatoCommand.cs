using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de atualização dos dados de contato do titular autenticado (RF-09 a RF-13).
/// <para>
/// <c>TitularId</c> vem do <c>ICurrentTitular</c> (extraído do JWT), não do body —
/// anti-tampering: um titular não pode editar dados de outro.
/// </para>
/// <para>
/// <c>Email</c>, <c>Endereco</c> e <c>Telefones</c> são opcionais/nullable — o titular pode
/// limpar esses dados passando <c>null</c>. A validação algorítmica de formato é feita nos
/// Value Objects (<c>Email.Create</c>, <c>Cep.Create</c>, <c>Uf.Create</c>, <c>Telefone.Create</c>)
/// dentro do handler — dispara <c>DomainException</c> (422) se inválido (RF-11).
/// </para>
/// </summary>
public record AtualizarContatoCommand(
    Guid TitularId,
    string? Email,
    EnderecoDto? Endereco,
    IReadOnlyList<TelefoneDto> Telefones) : ICommand<ContatoResponse>;
