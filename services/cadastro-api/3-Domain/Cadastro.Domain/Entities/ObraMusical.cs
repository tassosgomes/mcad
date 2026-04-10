using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

public class ObraMusical
{
    public Guid Id { get; private set; }
    public long Codigo { get; private set; }
    public string Titulo { get; private set; } = string.Empty;
    public string? Subtitulo { get; private set; }
    public TipoObra Tipo { get; private set; }
    public string? Genero { get; private set; }
    public string? Iswc { get; private set; }
    public string? BloqueioJustificativa { get; private set; }
    public StatusObra Status { get; private set; }
    public bool DominioPublico { get; private set; }
    public Guid? ObraDepuradaParaId { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    public ObraMusical? ObraDepuradaPara { get; private set; }
    public ICollection<TitularidadeAutoral> TitularidadesAutorais { get; private set; } = new List<TitularidadeAutoral>();

    private ObraMusical() { }

    public static ObraMusical Criar(string titulo, TipoObra tipo, string? subtitulo = null, string? genero = null)
    {
        return new ObraMusical
        {
            Id = Guid.NewGuid(),
            Titulo = titulo ?? throw new ArgumentNullException(nameof(titulo)),
            Subtitulo = subtitulo,
            Tipo = tipo,
            Genero = genero,
            Iswc = null,
            Status = StatusObra.Pendente,
            DominioPublico = false,
            ObraDepuradaParaId = null,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(string titulo, string? subtitulo, TipoObra tipo, string? genero)
    {
        if (Status == StatusObra.Depurada)
            throw new StatusConflictException("Obras depuradas não podem ser editadas");
        if (Status == StatusObra.DominioPublico)
            throw new StatusConflictException("Obras em Domínio Público não podem ser editadas");
        if (Status == StatusObra.Bloqueado)
            throw new StatusConflictException("Obras bloqueadas não podem ser editadas");

        Titulo = titulo ?? throw new ArgumentNullException(nameof(titulo));
        Subtitulo = subtitulo;
        Tipo = tipo;
        Genero = genero;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void Liberar()
    {
        if (Status != StatusObra.Pendente)
            throw new DomainException("Apenas obras PENDENTES podem ser liberadas");
        Status = StatusObra.Liberado;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void Bloquear(string justificativa)
    {
        if (Status == StatusObra.Depurada)
            throw new DomainException("Obras depuradas não podem ser bloqueadas");
        if (Status == StatusObra.Bloqueado)
            throw new DomainException("Obra já está bloqueada");
        
        BloqueioJustificativa = justificativa;
        Status = StatusObra.Bloqueado;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void Desbloquear()
    {
        if (Status != StatusObra.Bloqueado)
            throw new DomainException("Apenas obras BLOQUEADAS podem ser desbloqueadas");
        
        Status = StatusObra.Pendente;
        BloqueioJustificativa = null;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool RequerDepuracao(string novoTitulo)
    {
        return Status == StatusObra.Liberado && Titulo != novoTitulo;
    }

    public void AtribuirIswc(string iswc)
    {
        if (Status != StatusObra.Pendente)
            throw new DomainException("ISWC só pode ser atribuído a obras PENDENTES");
        if (Iswc != null)
            throw new DomainException("Obra já possui ISWC");

        Iswc = iswc ?? throw new ArgumentNullException(nameof(iswc));
        Status = StatusObra.Liberado;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void Depurar(Guid novaObraId)
    {
        if (Status != StatusObra.Liberado)
            throw new DomainException("Apenas obras LIBERADAS podem ser depuradas");

        Status = StatusObra.Depurada;
        ObraDepuradaParaId = novaObraId;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void MarcarDominioPublico(bool valor)
    {
        if (Status == StatusObra.Depurada)
            throw new StatusConflictException("Obras depuradas não podem ser alteradas");

        if (valor)
            Status = StatusObra.DominioPublico;
        else
            Status = Iswc != null ? StatusObra.Liberado : StatusObra.Pendente;

        DominioPublico = valor;
        AtualizadoEm = DateTime.UtcNow;
    }
}
