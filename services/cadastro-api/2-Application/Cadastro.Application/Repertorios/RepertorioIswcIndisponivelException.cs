namespace Cadastro.Application.Repertorios;

public class RepertorioIswcIndisponivelException : Exception
{
    public string ErrorCode => "ISWC_INDISPONIVEL";

    public RepertorioIswcIndisponivelException(string message)
        : base(message)
    {
    }

    public RepertorioIswcIndisponivelException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
