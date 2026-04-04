using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Pendentes.Commands;

public class ResolverPendenteCommandHandler : ICommandHandler<ResolverPendenteCommand, bool>
{
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly ICadastroHttpClient _cadastroHttpClient;

    public ResolverPendenteCommandHandler(IExecucaoRepository execucaoRepo, ICadastroHttpClient cadastroHttpClient)
    {
        _execucaoRepo = execucaoRepo;
        _cadastroHttpClient = cadastroHttpClient;
    }

    public async Task<bool> HandleAsync(ResolverPendenteCommand command, CancellationToken cancellationToken)
    {
        var execucao = await _execucaoRepo.GetByExecucaoIdAsync(command.ExecucaoId, cancellationToken);
        if (execucao == null)
            throw new NotFoundException("Execução não encontrada.");

        if (execucao.Captacao.Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações com status ABERTA podem ser modificadas.");

        if (execucao.Status != StatusExecucao.Pendente)
            throw new DomainException("Execução já está identificada.");

        string titulo = "";
        string? isrc = null;
        string? iswc = null;
        string interpretes = "";

        if (command.FonogramaId.HasValue)
        {
            var fonograma = await _cadastroHttpClient.GetFonogramaByIdAsync(command.FonogramaId.Value, cancellationToken);
            if (fonograma == null)
                throw new NotFoundException("Fonograma não encontrado no Cadastro.");
            if (fonograma.Status != "LIBERADO")
                throw new DomainException("Fonograma selecionado não está liberado. A execução continuará pendente.");

            titulo = fonograma.Titulo;
            isrc = fonograma.Isrc;
            interpretes = fonograma.Interpretes ?? "";
            
            // Buscar ISWC da obra associada se não estiver presente
            var obraDto = await _cadastroHttpClient.GetObraByIdAsync(fonograma.ObraId, cancellationToken);
            if (obraDto != null)
                iswc = obraDto.Iswc;
        }
        else
        {
            var obra = await _cadastroHttpClient.GetObraByIdAsync(command.ObraId, cancellationToken);
            if (obra == null)
                throw new NotFoundException("Obra não encontrada no Cadastro.");
            if (obra.Status != "LIBERADO")
                throw new DomainException("Obra selecionada não está liberada. A execução continuará pendente.");

            titulo = obra.Titulo;
            iswc = obra.Iswc;
        }

        execucao.Resolver(command.ObraId, command.FonogramaId, titulo, isrc, iswc, interpretes);
        await _execucaoRepo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
