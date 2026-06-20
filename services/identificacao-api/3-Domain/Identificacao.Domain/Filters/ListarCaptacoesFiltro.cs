namespace Identificacao.Domain.Filters;

public record ListarCaptacoesFiltro(
    Guid? RubricaId = null,
    DateOnly? PeriodoInicio = null,
    DateOnly? PeriodoFim = null,
    string? Status = null,
    Guid? AnalistaResponsavelId = null,
    Guid? UsuarioMusicaId = null,
    string? Sort = null,
    int? Page = 1,
    int? Size = 10);
