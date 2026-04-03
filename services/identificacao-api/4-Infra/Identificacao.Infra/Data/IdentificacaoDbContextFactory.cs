using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Identificacao.Infra.Data;

public class IdentificacaoDbContextFactory : IDesignTimeDbContextFactory<IdentificacaoDbContext>
{
    public IdentificacaoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<IdentificacaoDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=mcad;Username=gestauto;Password=gestauto123;SearchPath=identificacao");

        return new IdentificacaoDbContext(optionsBuilder.Options);
    }
}
