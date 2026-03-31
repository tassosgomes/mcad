using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

/// <summary>
/// Implementação do ITitularRepository usando EF Core + PostgreSQL.
/// ListarAsync: paginação server-side, filtros dinâmicos e ordenação.
///
/// NOTA: As queries de unicidade (ExisteDocumentoAsync) e filtro por Documento
/// usam SqlQuery interpolado (parametrizado, seguro contra SQL injection) diretamente,
/// pois "Cpf" e "Cnpj" são Value Objects com HasConversion: o EF Core LINQ
/// não consegue traduzir t.Cpf.Valor para SQL. Usamos schema qualificado
/// (cadastro.titulares) que funciona tanto em produção quanto no Testcontainer
/// (EnsureCreated com HasDefaultSchema("cadastro") cria o schema cadastro).
/// </summary>
public class TitularRepository : ITitularRepository
{
    private readonly CadastroDbContext _context;

    public TitularRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<Titular> Items, int Total)> ListarAsync(
        TitularFiltro filtro, CancellationToken cancellationToken)
    {
        var query = _context.Titulares
            .AsNoTracking()
            .Include(t => t.Associacao)
            .AsQueryable();

        // Filtros dinâmicos
        if (!string.IsNullOrWhiteSpace(filtro.Nome))
            query = query.Where(t => EF.Functions.ILike(t.Nome, $"%{filtro.Nome}%"));

        if (!string.IsNullOrWhiteSpace(filtro.Documento))
        {
            // "Cpf" e "Cnpj" são colunas com HasConversion: EF Core não traduz
            // t.Cpf.Valor → SQL diretamente. Buscamos os IDs via SqlQuery seguro.
            var likeDoc = $"%{filtro.Documento.ToUpperInvariant()}%";
            var matchingIds = await _context.Database
                .SqlQuery<Guid>($"""
                    SELECT "Id" AS "Value" FROM cadastro.titulares
                    WHERE "Cpf" ILIKE {likeDoc} OR "Cnpj" ILIKE {likeDoc}
                    """)
                .ToListAsync(cancellationToken);

            query = query.Where(t => matchingIds.Contains(t.Id));
        }

        if (filtro.AssociacaoId.HasValue)
            query = query.Where(t => t.AssociacaoId == filtro.AssociacaoId.Value);

        if (filtro.Status.HasValue)
            query = query.Where(t => t.Status == filtro.Status.Value);

        var total = await query.CountAsync(cancellationToken);

        // Ordenação dinâmica (prefixo "-" = DESC)
        query = filtro.Sort switch
        {
            "-nome"       => query.OrderByDescending(t => t.Nome),
            "associacao"  => query.OrderBy(t => t.Associacao.Sigla),
            "-associacao" => query.OrderByDescending(t => t.Associacao.Sigla),
            "status"      => query.OrderBy(t => t.Status),
            "-status"     => query.OrderByDescending(t => t.Status),
            _             => query.OrderBy(t => t.Nome), // "nome" (default) ou fallback
        };

        var items = await query
            .Skip((filtro.Page - 1) * filtro.Size)
            .Take(filtro.Size)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<Titular?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Titulares
            .AsNoTracking()
            .Include(t => t.Associacao)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<bool> ExisteDocumentoAsync(string documento, CancellationToken cancellationToken)
    {
        var doc = documento.ToUpperInvariant();
        // EF Core 8 SqlQuery<int> mapeia para coluna "Value"
        var count = await _context.Database
            .SqlQuery<int>($"""
                SELECT COUNT(1)::int AS "Value" FROM cadastro.titulares
                WHERE "Cpf" = {doc} OR "Cnpj" = {doc}
                """)
            .FirstOrDefaultAsync(cancellationToken);
        return count > 0;
    }

    public async Task<bool> ExisteDocumentoAsync(
        string documento, Guid excludeId, CancellationToken cancellationToken)
    {
        var doc = documento.ToUpperInvariant();
        var count = await _context.Database
            .SqlQuery<int>($"""
                SELECT COUNT(1)::int AS "Value" FROM cadastro.titulares
                WHERE "Id" != {excludeId}
                  AND ("Cpf" = {doc} OR "Cnpj" = {doc})
                """)
            .FirstOrDefaultAsync(cancellationToken);
        return count > 0;
    }

    public async Task<Titular> AddAsync(Titular titular, CancellationToken cancellationToken)
    {
        var entry = await _context.Titulares.AddAsync(titular, cancellationToken);
        return entry.Entity;
    }

    public void Update(Titular titular)
    {
        _context.Titulares.Update(titular);
    }

    public void Delete(Titular titular)
    {
        _context.Titulares.Remove(titular);
    }

    public async Task<bool> PossuiVinculosAsync(Guid titularId, CancellationToken cancellationToken)
    {
        return await _context.TitularidadesAutorais.AnyAsync(t => t.TitularId == titularId, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
