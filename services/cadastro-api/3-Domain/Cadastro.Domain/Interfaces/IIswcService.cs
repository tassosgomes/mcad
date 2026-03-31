namespace Cadastro.Domain.Interfaces;

public interface IIswcService
{
    Task<string> ObterIswcAsync(string titulo, IEnumerable<string> autores, string associacaoSigla, CancellationToken ct);
}
