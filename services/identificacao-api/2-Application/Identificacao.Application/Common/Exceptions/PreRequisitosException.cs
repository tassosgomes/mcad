using Identificacao.Application.Fechamento.Responses;

namespace Identificacao.Application.Common.Exceptions;

public class PreRequisitosException : Exception
{
    public string Code { get; }
    public IEnumerable<PreRequisitoItem> Itens { get; }

    public PreRequisitosException(string message, string code, IEnumerable<PreRequisitoItem> itens) : base(message)
    {
        Code = code;
        Itens = itens;
    }
}
