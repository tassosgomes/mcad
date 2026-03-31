namespace Cadastro.Application.Common.Exceptions;

public class DepuracaoNecessariaException : Exception
{
    public string Code { get; } = "DEPURACAO_NECESSARIA";

    public DepuracaoNecessariaException(string message) : base(message)
    {
    }
}
