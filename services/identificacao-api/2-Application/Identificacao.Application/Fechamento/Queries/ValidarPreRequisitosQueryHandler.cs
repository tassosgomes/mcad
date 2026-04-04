using MediatR;
using Identificacao.Application.Fechamento.Responses;
using Identificacao.Domain.Interfaces;
using Identificacao.Domain.Exceptions;

using Identificacao.Application.Common.Exceptions;

namespace Identificacao.Application.Fechamento.Queries;

public class ValidarPreRequisitosQueryHandler : IRequestHandler<ValidarPreRequisitosQuery, PreRequisitosResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly ICadastroHttpClient _cadastroClient;

    public ValidarPreRequisitosQueryHandler(
        ICaptacaoRepository captacaoRepo, 
        IExecucaoRepository execucaoRepo,
        ICadastroHttpClient cadastroClient)
    {
        _captacaoRepo = captacaoRepo;
        _execucaoRepo = execucaoRepo;
        _cadastroClient = cadastroClient;
    }

    public async Task<PreRequisitosResponse> Handle(ValidarPreRequisitosQuery query, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(query.CaptacaoId, ct)
            ?? throw new NotFoundException($"Captação {query.CaptacaoId} não encontrada.");

        var itens = new List<PreRequisitoItem>();
        var totalExecucoes = await _execucaoRepo.ContarPorCaptacaoAsync(query.CaptacaoId, ct);
        var pendentes = await _execucaoRepo.ContarPendentesAsync(query.CaptacaoId, ct);

        itens.Add(new("min_execucoes", "Ao menos 1 execução registrada",
            totalExecucoes >= 1, totalExecucoes == 0 ? "Nenhuma execução registrada" : null));

        itens.Add(new("zero_pendentes", "Nenhuma execução pendente de identificação",
            pendentes == 0, pendentes > 0 ? $"{pendentes} execuções pendentes de identificação" : null));

        var obrasNaoLiberadas = await VerificarObrasLiberadasAsync(query.CaptacaoId, ct);
        itens.Add(new("obras_liberadas", "Todas as obras/fonogramas liberadas no Cadastro",
            obrasNaoLiberadas == 0, obrasNaoLiberadas > 0 ? $"{obrasNaoLiberadas} execuções referenciam obras/fonogramas não liberadas" : null));

        if (captacao.Rubrica!.ExigeClassificacao)
        {
            var semClassificacao = await _execucaoRepo.ContarSemTipoUtilizacaoAsync(query.CaptacaoId, ct);
            itens.Add(new("classificacao", "Todas as execuções com tipo de utilização",
                semClassificacao == 0, semClassificacao > 0 ? $"{semClassificacao} execuções sem tipo de utilização" : null));

            var semHorario = await _execucaoRepo.ContarSemHorarioAsync(query.CaptacaoId, ct);
            itens.Add(new("horarios", "Todas as execuções com início e fim",
                semHorario == 0, semHorario > 0 ? $"{semHorario} execuções sem horário de início/fim" : null));
        }

        return new PreRequisitosResponse(
            query.CaptacaoId,
            itens.All(i => i.Atendido),
            itens,
            new ResumoFechamento(totalExecucoes, totalExecucoes - pendentes, pendentes,
                captacao.Rubrica.Nome, captacao.Periodo, captacao.Rubrica.ExigeClassificacao));
    }

    private async Task<int> VerificarObrasLiberadasAsync(Guid captacaoId, CancellationToken ct)
    {
        var execucoes = await _execucaoRepo.ListarTodasDaCaptacaoAsync(captacaoId, ct);
        
        var obrasIds = execucoes.Where(e => e.ObraId != Guid.Empty).Select(e => e.ObraId).Distinct();
        var fonogramasIds = execucoes.Where(e => e.FonogramaId.HasValue).Select(e => e.FonogramaId!.Value).Distinct();

        int naoLiberadas = 0;

        var tasksObras = obrasIds.Select(async id => {
            try {
                var o = await _cadastroClient.GetObraByIdAsync(id, ct);
                return o == null || o.Status != "LIBERADO";
            } catch { return true; }
        });
        var resultadosObras = await Task.WhenAll(tasksObras);
        naoLiberadas += resultadosObras.Count(r => r);

        var tasksFonos = fonogramasIds.Select(async id => {
            try {
                var f = await _cadastroClient.GetFonogramaByIdAsync(id, ct);
                return f == null || f.Status != "LIBERADO";
            } catch { return true; }
        });
        var resultadosFonos = await Task.WhenAll(tasksFonos);
        naoLiberadas += resultadosFonos.Count(r => r);

        return naoLiberadas;
    }
}
