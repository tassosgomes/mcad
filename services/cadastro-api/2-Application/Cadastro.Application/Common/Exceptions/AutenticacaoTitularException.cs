namespace Cadastro.Application.Common.Exceptions;

/// <summary>
/// Exception lançada quando a autenticação do titular falha — credencial inexistente,
/// senha incorreta ou conta bloqueada. Sempre usa mensagem genérica "Credenciais inválidas"
/// para não revelar qual campo está incorreto (RF-06). Mapeada para HTTP 401 pelo
/// <c>GlobalExceptionHandler</c>.
/// </summary>
public class AutenticacaoTitularException : Exception
{
    private const string MensagemPadrao = "Credenciais inválidas";

    public AutenticacaoTitularException() : base(MensagemPadrao)
    {
    }

    public AutenticacaoTitularException(string message) : base(message)
    {
    }
}
