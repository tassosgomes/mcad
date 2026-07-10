using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore.Storage;

namespace Cadastro.Infra.Data;

public class CadastroUnitOfWork : ICadastroUnitOfWork
{
    private readonly CadastroDbContext _context;

    public CadastroUnitOfWork(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<ICadastroTransaction> BeginTransactionAsync(CancellationToken cancellationToken)
    {
        var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        return new CadastroTransaction(transaction);
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    private sealed class CadastroTransaction : ICadastroTransaction
    {
        private readonly IDbContextTransaction _transaction;

        public CadastroTransaction(IDbContextTransaction transaction)
        {
            _transaction = transaction;
        }

        public async Task CommitAsync(CancellationToken cancellationToken)
        {
            await _transaction.CommitAsync(cancellationToken);
        }

        public async Task RollbackAsync(CancellationToken cancellationToken)
        {
            await _transaction.RollbackAsync(cancellationToken);
        }

        public async ValueTask DisposeAsync()
        {
            await _transaction.DisposeAsync();
        }
    }
}
