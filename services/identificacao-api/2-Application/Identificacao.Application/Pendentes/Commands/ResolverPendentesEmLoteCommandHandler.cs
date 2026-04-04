using Identificacao.Application.Common;
using Identificacao.Application.Pendentes.Responses;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Application.Pendentes.Commands;

public class ResolverPendentesEmLoteCommandHandler : ICommandHandler<ResolverPendentesEmLoteCommand, ResolverLoteResponse>
{
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly ICadastroHttpClient _cadastroHttpClient;

    public ResolverPendentesEmLoteCommandHandler(IExecucaoRepository execucaoRepo, ICadastroHttpClient cadastroHttpClient)
    {
        _execucaoRepo = execucaoRepo;
        _cadastroHttpClient = cadastroHttpClient;
    }

    public async Task<ResolverLoteResponse> HandleAsync(ResolverPendentesEmLoteCommand command, CancellationToken cancellationToken)
    {
        int resolvidas = 0;
        int rejeitadas = 0;
        var detalhesRejeitadas = new List<DetalheRejeicao>();

        string titulo = "";
        string? isrc = null;
        string? iswc = null;
        string interpretes = "";

        // 1. Validar obra/fonograma liberado UMA vez
        if (command.FonogramaId.HasValue)
        {
            var fonograma = await _cadastroHttpClient.GetFonogramaByIdAsync(command.FonogramaId.Value, cancellationToken);
            if (fonograma == null || fonograma.Status != "LIBERADO")
            {
                var motivo = fonograma == null ? "Fonograma não encontrado." : "Fonograma não está liberado.";
                return RejeitarLoteInteiro(command.Execucoes, motivo);
            }

            titulo = fonograma.Titulo;
            isrc = fonograma.Isrc;
            interpretes = fonograma.Interpretes ?? "";
            
            var obraDto = await _cadastroHttpClient.GetObraByIdAsync(fonograma.ObraId, cancellationToken);
            if (obraDto != null)
                iswc = obraDto.Iswc;
        }
        else
        {
            var obra = await _cadastroHttpClient.GetObraByIdAsync(command.ObraId, cancellationToken);
            if (obra == null || obra.Status != "LIBERADO")
            {
                var motivo = obra == null ? "Obra não encontrada." : "Obra não está liberada.";
                return RejeitarLoteInteiro(command.Execucoes, motivo);
            }

            titulo = obra.Titulo;
            iswc = obra.Iswc;
        }

        // 2. Loop com try/catch por execução
        foreach (var target in command.Execucoes)
        {
            try
            {
                var execucao = await _execucaoRepo.GetByIdAsync(target.CaptacaoId, target.ExecucaoId, cancellationToken);
                if (execucao == null)
                {
                    Rejeitar(target.ExecucaoId, "Execução não encontrada.");
                    continue;
                }

                if (execucao.Captacao.Status != StatusCaptacao.Aberta)
                {
                    Rejeitar(target.ExecucaoId, "Apenas captações com status ABERTA podem ser modificadas.");
                    continue;
                }

                if (execucao.Status != StatusExecucao.Pendente)
                {
                    Rejeitar(target.ExecucaoId, "Execução já está identificada.");
                    continue;
                }

                execucao.Resolver(command.ObraId, command.FonogramaId, titulo, isrc, iswc, interpretes);
                resolvidas++;
            }
            catch (DomainException ex)
            {
                Rejeitar(target.ExecucaoId, ex.Message);
            }
            catch (Exception ex)
            {
                Rejeitar(target.ExecucaoId, "Erro interno: " + ex.Message);
            }
        }

        if (resolvidas > 0)
        {
            await _execucaoRepo.SaveChangesAsync(cancellationToken);
        }

        return new ResolverLoteResponse(resolvidas, rejeitadas, detalhesRejeitadas);

        void Rejeitar(Guid id, string motivo)
        {
            rejeitadas++;
            detalhesRejeitadas.Add(new DetalheRejeicao(id, motivo));
        }
    }

    private ResolverLoteResponse RejeitarLoteInteiro(List<ExecucaoTarget> execucoes, string motivo)
    {
        var detalhes = execucoes.Select(e => new DetalheRejeicao(e.ExecucaoId, motivo)).ToList();
        return new ResolverLoteResponse(0, execucoes.Count, detalhes);
    }
}
