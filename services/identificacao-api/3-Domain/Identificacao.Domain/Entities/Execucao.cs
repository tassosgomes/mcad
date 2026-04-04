using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Domain.Entities;

public class Execucao
{
    public Guid Id { get; private set; }
    public Guid CaptacaoId { get; private set; }
    public Captacao Captacao { get; private set; } = null!;
    public Guid ObraId { get; private set; }
    public Guid? FonogramaId { get; private set; }
    public string ObraTitulo { get; private set; } = null!;
    public string? FonogramaIsrc { get; private set; }
    public string? ObraIswc { get; private set; }
    public string Interpretes { get; private set; } = null!;
    public TimeOnly Inicio { get; private set; }
    public TimeOnly Fim { get; private set; }
    public int DuracaoSegundos { get; private set; }
    public int Quantidade { get; private set; }
    public Guid? TipoUtilizacaoId { get; private set; }
    public TipoUtilizacao? TipoUtilizacao { get; private set; }
    public string? TituloPrograma { get; private set; }
    public StatusExecucao Status { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    private Execucao() { }

    public static Execucao Criar(
        Guid captacaoId, Guid obraId, Guid? fonogramaId,
        string obraTitulo, string? fonogramaIsrc, string? obraIswc,
        string interpretes, TimeOnly inicio, TimeOnly fim,
        int quantidade, Guid? tipoUtilizacaoId, string? tituloPrograma,
        StatusExecucao status)
    {
        if (fim <= inicio)
            throw new DomainException("O horário de fim deve ser posterior ao início.");

        return new Execucao
        {
            Id = Guid.NewGuid(),
            CaptacaoId = captacaoId,
            ObraId = obraId,
            FonogramaId = fonogramaId,
            ObraTitulo = obraTitulo ?? throw new ArgumentNullException(nameof(obraTitulo)),
            FonogramaIsrc = fonogramaIsrc,
            ObraIswc = obraIswc,
            Interpretes = interpretes ?? "",
            Inicio = inicio,
            Fim = fim,
            DuracaoSegundos = (int)(fim.ToTimeSpan() - inicio.ToTimeSpan()).TotalSeconds,
            Quantidade = quantidade,
            TipoUtilizacaoId = tipoUtilizacaoId,
            TituloPrograma = tituloPrograma,
            Status = status,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(
        Guid obraId, Guid? fonogramaId,
        string obraTitulo, string? fonogramaIsrc, string? obraIswc,
        string interpretes, TimeOnly inicio, TimeOnly fim,
        int quantidade, Guid? tipoUtilizacaoId, string? tituloPrograma,
        StatusExecucao status)
    {
        if (fim <= inicio)
            throw new DomainException("O horário de fim deve ser posterior ao início.");

        ObraId = obraId;
        FonogramaId = fonogramaId;
        ObraTitulo = obraTitulo ?? throw new ArgumentNullException(nameof(obraTitulo));
        FonogramaIsrc = fonogramaIsrc;
        ObraIswc = obraIswc;
        Interpretes = interpretes ?? "";
        Inicio = inicio;
        Fim = fim;
        DuracaoSegundos = (int)(fim.ToTimeSpan() - inicio.ToTimeSpan()).TotalSeconds;
        Quantidade = quantidade;
        TipoUtilizacaoId = tipoUtilizacaoId;
        TituloPrograma = tituloPrograma;
        Status = status;
        AtualizadoEm = DateTime.UtcNow;
    }
    public void Resolver(Guid obraId, Guid? fonogramaId, string obraTitulo,
        string? fonogramaIsrc, string? obraIswc, string interpretes)
    {
        if (Status != StatusExecucao.Pendente)
            throw new DomainException("Execução já está identificada.");
        ObraId = obraId;
        FonogramaId = fonogramaId;
        ObraTitulo = obraTitulo ?? throw new ArgumentNullException(nameof(obraTitulo));
        FonogramaIsrc = fonogramaIsrc;
        ObraIswc = obraIswc;
        Interpretes = interpretes ?? "";
        Status = StatusExecucao.Identificada;
        AtualizadoEm = DateTime.UtcNow;
    }
}
