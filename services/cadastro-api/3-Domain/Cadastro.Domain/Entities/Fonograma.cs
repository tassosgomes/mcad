using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.Domain.Entities;

public class Fonograma
{
    public Guid Id { get; private set; }
    public Isrc Isrc { get; private set; } = null!;
    public Guid ObraId { get; private set; }
    public string PaisOrigem { get; private set; } = string.Empty;
    public DateOnly? DataGravacao { get; private set; }
    public DateOnly? DataLancamento { get; private set; }
    public StatusFonograma Status { get; private set; }
    public Guid? FonogramaDepuradoParaId { get; private set; }
    public bool PercentuaisDesatualizados { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    // Navigation
    public ObraMusical Obra { get; private set; } = null!;
    public Fonograma? FonogramaDepuradoPara { get; private set; }

    private Fonograma() { } // EF Core

    public static Fonograma Criar(Isrc isrc, Guid obraId, string paisOrigem,
        DateOnly? dataGravacao = null, DateOnly? dataLancamento = null)
    {
        return new Fonograma
        {
            Id = Guid.NewGuid(),
            Isrc = isrc ?? throw new ArgumentNullException(nameof(isrc)),
            ObraId = obraId,
            PaisOrigem = paisOrigem ?? throw new ArgumentNullException(nameof(paisOrigem)),
            DataGravacao = dataGravacao,
            DataLancamento = dataLancamento,
            Status = StatusFonograma.PendenteValidacao,
            FonogramaDepuradoParaId = null,
            PercentuaisDesatualizados = false,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(Isrc isrc, string paisOrigem, DateOnly? dataGravacao, DateOnly? dataLancamento)
    {
        if (Status == StatusFonograma.Depurado)
            throw new DomainException("Fonogramas depurados não podem ser editados");
        Isrc = isrc ?? throw new ArgumentNullException(nameof(isrc));
        PaisOrigem = paisOrigem ?? throw new ArgumentNullException(nameof(paisOrigem));
        DataGravacao = dataGravacao;
        DataLancamento = dataLancamento;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool RequerDepuracao(Isrc novoIsrc)
    {
        return Status == StatusFonograma.Liberado && Isrc.Valor != novoIsrc.Valor;
    }

    public void Depurar(Guid novoFonogramaId)
    {
        if (Status != StatusFonograma.Liberado)
            throw new DomainException("Apenas fonogramas LIBERADOS podem ser depurados");
        Status = StatusFonograma.Depurado;
        FonogramaDepuradoParaId = novoFonogramaId;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void MarcarPercentuaisDesatualizados()
    {
        PercentuaisDesatualizados = true;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void MarcarPercentuaisAtualizados()
    {
        PercentuaisDesatualizados = false;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool PodeSerExcluido =>
        Status == StatusFonograma.PendenteValidacao || Status == StatusFonograma.PendenteDocumentacao;
}
