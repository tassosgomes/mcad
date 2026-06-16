namespace Identificacao.IntegrationTests.Fixtures;

/// <summary>
/// Helper para o filtro dinâmico do <c>CaptacaoRepository.ListarAsync(dynamic)</c>.
/// O repositório acessa <c>filtro.RubricaId</c>, <c>filtro.PeriodoInicial</c> etc. diretamente —
/// qualquer propriedade ausente quebra o binder. Esta classe garante todas presentes.
/// </summary>
public class CaptacaoFiltro
{
    public Guid? RubricaId { get; set; }
    public DateOnly? PeriodoInicial { get; set; }
    public DateOnly? PeriodoFinal { get; set; }
    public string? Status { get; set; }
    public Guid? AnalistaResponsavelId { get; set; }
    public Guid? UsuarioMusicaId { get; set; }
    public string? Sort { get; set; }
    public int? Page { get; set; }
    public int? Size { get; set; }
}
