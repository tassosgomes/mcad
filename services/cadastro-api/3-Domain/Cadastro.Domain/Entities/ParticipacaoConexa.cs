using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

public class ParticipacaoConexa
{
    public Guid Id { get; private set; }
    public Guid FonogramaId { get; private set; }
    public Guid TitularId { get; private set; }
    public CategoriaConexo Categoria { get; private set; }
    public decimal? Percentual { get; private set; }  // null = não calculado
    public DateTime CriadoEm { get; private set; }

    // Navigation
    public Fonograma Fonograma { get; private set; } = null!;
    public Titular Titular { get; private set; } = null!;

    private ParticipacaoConexa() { } // EF Core

    public static ParticipacaoConexa Criar(Guid fonogramaId, Guid titularId, CategoriaConexo categoria)
    {
        return new ParticipacaoConexa
        {
            Id = Guid.NewGuid(),
            FonogramaId = fonogramaId,
            TitularId = titularId,
            Categoria = categoria,
            Percentual = null, // aguardando cálculo
            CriadoEm = DateTime.UtcNow,
        };
    }

    public void DefinirPercentual(decimal percentual)
    {
        if (percentual <= 0 || percentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");
            
        Percentual = Math.Round(percentual, 4);
    }

    public void AjustarPercentualManual(decimal percentual)
    {
        if (Categoria == CategoriaConexo.MusicoExecutante)
            throw new DomainException("Percentual de Músico Executante não pode ser editado manualmente");
            
        DefinirPercentual(percentual);
    }

    public bool Editavel => Categoria != CategoriaConexo.MusicoExecutante;
}
