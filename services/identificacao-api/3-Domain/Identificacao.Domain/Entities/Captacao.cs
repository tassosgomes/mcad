
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Domain.Entities;

public class Captacao
{
    public Guid Id { get; private set; }
    public Guid RubricaId { get; private set; }
    public Rubrica? Rubrica { get; private set; }
    public DateOnly Periodo { get; private set; }
    public string UsuarioDeMusica { get; private set; } = string.Empty;
    public StatusCaptacao Status { get; private set; }
    public Guid AnalistaResponsavelId { get; private set; }
    public string AnalistaResponsavelNome { get; private set; } = string.Empty;
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    private Captacao() { } // EF Core

    public static Captacao Criar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica,
        Guid analistaId, string analistaNome) => new()
    {
        Id = Guid.NewGuid(),
        RubricaId = rubricaId,
        Periodo = periodo,
        UsuarioDeMusica = usuarioDeMusica,
        Status = StatusCaptacao.Aberta,
        AnalistaResponsavelId = analistaId,
        AnalistaResponsavelNome = analistaNome,
        CriadoEm = DateTime.UtcNow,
        AtualizadoEm = DateTime.UtcNow
    };

    public void Atualizar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica)
    {
        ValidarAberta();
        RubricaId = rubricaId;
        Periodo = periodo;
        UsuarioDeMusica = usuarioDeMusica;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void ValidarPropriedade(Guid analistaId)
    {
        if (AnalistaResponsavelId != analistaId)
            throw new DomainException("Apenas o analista responsável pode modificar esta captação.");
    }

    public void ValidarAberta()
    {
        if (Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações com status ABERTA podem ser modificadas.");
    }

    public void Fechar()
    {
        ValidarAberta();
        Status = StatusCaptacao.Fechada;
        AtualizadoEm = DateTime.UtcNow;
    }
}
