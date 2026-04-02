using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Identificacao.Infra.Data;

public class IdentificacaoDbContextFactory : IDesignTimeDbContextFactory<IdentificacaoDbContext>
{
    public IdentificacaoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<IdentificacaoDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=IdentificacaoDb;Username=postgres;Password=postgres");

        return new IdentificacaoDbContext(optionsBuilder.Options);
    }
}
