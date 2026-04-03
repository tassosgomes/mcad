using Cadastro.Application.Busca.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace Cadastro.Application.Busca.Queries;

public class BuscaCadastroQueryHandler : IQueryHandler<BuscaCadastroQuery, BuscaCadastroResponse>
{
    private readonly IObraRepository _obraRepo;
    private readonly IFonogramaRepository _fonogramaRepo;

    public BuscaCadastroQueryHandler(IObraRepository obraRepo, IFonogramaRepository fonogramaRepo)
    {
        _obraRepo = obraRepo;
        _fonogramaRepo = fonogramaRepo;
    }

    public async Task<BuscaCadastroResponse> HandleAsync(BuscaCadastroQuery query, CancellationToken ct)
    {
        if (query.Q.Length < 3)
            throw new ValidationException("O termo de busca deve ter no mínimo 3 caracteres");

        var resultados = new List<ResultadoBuscaDto>();

        if (query.Tipo is "todos" or "obra")
        {
            var obras = await _obraRepo.BuscarAsync(query.Q, query.Size, ct);
            resultados.AddRange(obras.Select(o => new ResultadoBuscaDto(
                Tipo: "obra", 
                Id: o.Id, 
                ObraId: null,
                Titulo: o.Titulo, 
                Isrc: null, 
                Iswc: o.Iswc,
                Interpretes: null, 
                Status: o.Status.ToString().ToUpper())));
        }

        if (query.Tipo is "todos" or "fonograma")
        {
            var fonogramas = await _fonogramaRepo.BuscarAsync(query.Q, query.Size, ct);
            resultados.AddRange(fonogramas.Select(f => new ResultadoBuscaDto(
                Tipo: "fonograma", 
                Id: f.Id, 
                ObraId: f.ObraId,
                Titulo: f.Obra.Titulo, 
                Isrc: f.Isrc?.Valor,
                Iswc: f.Obra.Iswc,
                Interpretes: FormatarInterpretes(f.ParticipacoesConexas),
                Status: f.Status.ToString().ToUpper())));
        }

        return new BuscaCadastroResponse(resultados.Take(query.Size));
    }

    private static string? FormatarInterpretes(IEnumerable<ParticipacaoConexa>? participacoes)
    {
        if (participacoes == null || !participacoes.Any()) return null;

        var interpretes = participacoes
            .Where(p => p.Categoria == CategoriaConexo.Interprete)
            .Take(3)
            .Select(p => p.Titular.Nome);

        var joined = string.Join(" / ", interpretes);
        return string.IsNullOrWhiteSpace(joined) ? null : joined;
    }
}
