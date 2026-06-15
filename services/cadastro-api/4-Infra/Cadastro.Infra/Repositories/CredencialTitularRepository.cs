using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

/// <summary>
/// Implementação de <see cref="ICredencialTitularRepository"/> com EF Core.
/// <para>
/// <see cref="ByDocumentoAsync"/> faz JOIN com <c>titulares</c> pois o documento
/// (Cpf/Cnpj) vive no <see cref="Titular"/> (VO com HasConversion) e não na credencial.
/// </para>
/// </summary>
public class CredencialTitularRepository : ICredencialTitularRepository
{
    private readonly CadastroDbContext _context;

    public CredencialTitularRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<CredencialTitular?> ByTitularIdAsync(Guid titularId, CancellationToken cancellationToken)
    {
        return await _context.CredenciaisTitular
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TitularId == titularId, cancellationToken);
    }

    public async Task<CredencialTitular?> ByDocumentoAsync(string documento, CancellationToken cancellationToken)
    {
        var doc = (documento ?? string.Empty).ToUpperInvariant();

        // JOIN com Titulares — o documento (Cpf/Cnpj) está no Titular, não na credencial.
        // O VO tem HasConversion; utilizamos SqlQuery interpolada (parametrizada) para
        // contornar a impossibilidade de traduzir t.Cpf.Valor em LINQ.
        var titularId = await _context.Database
            .SqlQuery<Guid>($"""
                SELECT "Id" AS "Value" FROM cadastro.titulares
                WHERE "Cpf" = {doc} OR "Cnpj" = {doc}
                """)
            .FirstOrDefaultAsync(cancellationToken);

        if (titularId == Guid.Empty)
            return null;

        return await _context.CredenciaisTitular
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TitularId == titularId, cancellationToken);
    }

    public async Task AddAsync(CredencialTitular credencial, CancellationToken cancellationToken)
    {
        await _context.CredenciaisTitular.AddAsync(credencial, cancellationToken);
    }

    /// <summary>
    /// Anexa a credencial ao contexto como Modified para que mutações de lockout
    /// (IncrementarFalha/ResetarFalhas) persistam ao SaveChangesAsync.
    /// Necessário porque <see cref="ByDocumentoAsync"/> / <see cref="ByTitularIdAsync"/>
    /// retornam entidades AsNoTracking.
    /// </summary>
    public void Update(CredencialTitular credencial)
    {
        _context.CredenciaisTitular.Update(credencial);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
