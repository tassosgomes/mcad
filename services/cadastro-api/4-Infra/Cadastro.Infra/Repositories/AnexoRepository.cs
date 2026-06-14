using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class AnexoRepository : IAnexoRepository
{
    private readonly CadastroDbContext _context;

    public AnexoRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<Anexo?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        => await _context.Anexos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public async Task<Anexo?> GetAtivoByIdAsync(Guid id, CancellationToken cancellationToken)
        => await _context.Anexos
            .FirstOrDefaultAsync(a => a.Id == id && a.ExcluidoEm == null, cancellationToken);

    public async Task<Anexo?> GetAtivoByEntidadeECategoriaAsync(
        Guid entidadeId, CategoriaAnexo categoria, CancellationToken cancellationToken)
        => await _context.Anexos
            .FirstOrDefaultAsync(
                a => a.EntidadeId == entidadeId && a.Categoria == categoria && a.ExcluidoEm == null,
                cancellationToken);

    public async Task<IEnumerable<Anexo>> ListarAtivosPorEntidadeAsync(
        TipoEntidadeAnexo entidadeTipo, Guid entidadeId, CancellationToken cancellationToken)
        => await _context.Anexos
            .AsNoTracking()
            .Where(a => a.EntidadeTipo == entidadeTipo && a.EntidadeId == entidadeId && a.ExcluidoEm == null)
            .OrderBy(a => a.Categoria)
            .ThenBy(a => a.CriadoEm)
            .ToListAsync(cancellationToken);

    public async Task<Anexo> AddAsync(Anexo anexo, CancellationToken cancellationToken)
    {
        var entry = await _context.Anexos.AddAsync(anexo, cancellationToken);
        return entry.Entity;
    }

    public void Update(Anexo anexo)
    {
        _context.Anexos.Update(anexo);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
