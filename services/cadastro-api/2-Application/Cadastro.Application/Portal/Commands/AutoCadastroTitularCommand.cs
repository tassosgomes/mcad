using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Commands;

/// <summary>
/// Command de auto-cadastro do titular no Portal (RF-01, RF-02, RF-03, RF-04).
/// <para>
/// O titular informa seu CPF/CNPJ, o CAE/IPI cadastrado no ECAD e uma senha.
/// O handler valida a correspondência CPF/CNPJ + CAE/IPI contra o cadastro
/// existente; se válida, cria a credencial com hash BCrypt (work factor 12).
/// </para>
/// </summary>
public record AutoCadastroTitularCommand(
    string Documento,
    string CaeIpi,
    string Senha) : ICommand<AutoCadastroResponse>;
