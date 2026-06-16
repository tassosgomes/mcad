using Identificacao.Domain.Entities;

namespace Identificacao.Application.Audit;

public static class IdentificacaoAuditMappers
{
    public static IReadOnlyDictionary<string, object?> Map(Captacao c) =>
        new Dictionary<string, object?>
        {
            ["id"] = c.Id.ToString(),
            ["rubricaId"] = c.RubricaId.ToString(),
            ["periodo"] = c.Periodo.ToString("yyyy-MM-dd"),
            ["usuarioMusicaId"] = c.UsuarioMusicaId.ToString(),
            ["usuarioMusicaNome"] = c.UsuarioMusicaNome,
            ["status"] = c.Status.ToString().ToUpperInvariant(),
            ["analistaResponsavelId"] = c.AnalistaResponsavelId.ToString(),
            ["analistaResponsavelNome"] = c.AnalistaResponsavelNome,
            ["criadoEm"] = c.CriadoEm,
            ["atualizadoEm"] = c.AtualizadoEm
        };

    public static IReadOnlyDictionary<string, object?> Map(Execucao e) =>
        new Dictionary<string, object?>
        {
            ["id"] = e.Id.ToString(),
            ["captacaoId"] = e.CaptacaoId.ToString(),
            ["obraId"] = e.ObraId.ToString(),
            ["fonogramaId"] = e.FonogramaId?.ToString(),
            ["obraTitulo"] = e.ObraTitulo,
            ["fonogramaIsrc"] = e.FonogramaIsrc,
            ["obraIswc"] = e.ObraIswc,
            ["interpretes"] = e.Interpretes,
            ["inicio"] = e.Inicio.ToString("HH:mm:ss"),
            ["fim"] = e.Fim.ToString("HH:mm:ss"),
            ["duracaoSegundos"] = e.DuracaoSegundos,
            ["quantidade"] = e.Quantidade,
            ["tipoUtilizacaoId"] = e.TipoUtilizacaoId?.ToString(),
            ["tituloPrograma"] = e.TituloPrograma,
            ["status"] = e.Status.ToString().ToUpperInvariant(),
            ["criadoEm"] = e.CriadoEm,
            ["atualizadoEm"] = e.AtualizadoEm
        };

    public static IReadOnlyDictionary<string, object?> Map(Upload u) =>
        new Dictionary<string, object?>
        {
            ["id"] = u.Id.ToString(),
            ["captacaoId"] = u.CaptacaoId.ToString(),
            ["nomeArquivo"] = u.NomeArquivo,
            ["storageFileId"] = u.StorageFileId,
            ["analistaId"] = u.AnalistaId.ToString(),
            ["status"] = u.Status.ToString().ToUpperInvariant(),
            ["totalLinhas"] = u.TotalLinhas,
            ["totalErros"] = u.TotalErros,
            ["execucoesCriadas"] = u.ExecucoesCriadas,
            ["criadoEm"] = u.CriadoEm,
            ["processadoEm"] = u.ProcessadoEm
        };
}
