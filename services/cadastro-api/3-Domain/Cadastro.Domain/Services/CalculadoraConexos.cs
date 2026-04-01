using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Services;

public static class CalculadoraConexos
{
    private const decimal FatiaInterpreteCom = 43.7m;
    private const decimal FatiaProdutorCom = 41.7m;
    private const decimal FatiaMusicoCom = 14.6m;
    private const decimal FatiaInterpreteSem = 50.0m;
    private const decimal FatiaProdutorSem = 50.0m;

    public static void Calcular(IList<ParticipacaoConexa> participacoes)
    {
        var interpretes = participacoes.Where(p => p.Categoria == CategoriaConexo.Interprete).ToList();
        var produtores = participacoes.Where(p => p.Categoria == CategoriaConexo.ProdutorFonografico).ToList();
        var musicos = participacoes.Where(p => p.Categoria == CategoriaConexo.MusicoExecutante).ToList();

        if (!interpretes.Any())
            throw new DomainException("Fonograma deve ter ao menos 1 Intérprete");
        if (!produtores.Any())
            throw new DomainException("Fonograma deve ter ao menos 1 Produtor Fonográfico");

        bool temMusicos = musicos.Any();

        decimal fatiaInterprete = temMusicos ? FatiaInterpreteCom : FatiaInterpreteSem;
        decimal fatiaProdutor = temMusicos ? FatiaProdutorCom : FatiaProdutorSem;

        // Distribuir igualitariamente dentro de cada fatia
        DistribuirIgualitario(interpretes, fatiaInterprete);
        DistribuirIgualitario(produtores, fatiaProdutor);

        if (temMusicos)
            DistribuirIgualitario(musicos, FatiaMusicoCom);
    }

    private static void DistribuirIgualitario(IList<ParticipacaoConexa> grupo, decimal fatiaTotal)
    {
        int n = grupo.Count;
        if (n == 0) return;

        decimal porParticipante = Math.Truncate(fatiaTotal / n * 10000m) / 10000m; // truncar 4 casas
        
        // Atribuir truncado a todos
        foreach (var p in grupo)
            p.DefinirPercentual(porParticipante);

        // Calcular diferença e atribuir ao primeiro (RN-12)
        decimal somaAtribuida = porParticipante * n;
        decimal diferenca = Math.Round(fatiaTotal - somaAtribuida, 4);

        if (diferenca != 0 && grupo.Any())
            grupo[0].DefinirPercentual(porParticipante + diferenca);
    }
}
