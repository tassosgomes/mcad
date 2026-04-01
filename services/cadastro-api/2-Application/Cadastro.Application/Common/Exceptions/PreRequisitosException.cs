using Cadastro.Domain.Services;

namespace Cadastro.Application.Common.Exceptions;

public class PreRequisitosException : Exception
{
    public IReadOnlyList<PreRequisito> Pendencias { get; }

    public PreRequisitosException(string message, IReadOnlyList<PreRequisito> pendencias) 
        : base(message)
    {
        Pendencias = pendencias;
    }
}
