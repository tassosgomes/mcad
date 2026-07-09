using System.Net.Http.Json;
using AwesomeAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Infra.Data;
using Identificacao.IntegrationTests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace Identificacao.IntegrationTests;

public class UsuarioMusicaEndpointsIntegrationTests : IClassFixture<IdentificacaoApiFactory>, IAsyncLifetime
{
    private readonly IdentificacaoApiFactory _factory;
    private HttpClient _client = null!;

    public UsuarioMusicaEndpointsIntegrationTests(IdentificacaoApiFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _client = _factory.CreateAuthenticatedClient(roles: ["identificacao.consultor"]);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();

        db.UsuariosMusicaSnapshot.RemoveRange(db.UsuariosMusicaSnapshot);
        await db.SaveChangesAsync();

        db.UsuariosMusicaSnapshot.AddRange(
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio Globo SP", "11111111000111", "ATIVO", DateTime.UtcNow),
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio Jovem Pan", "22222222000122", "ATIVO", DateTime.UtcNow),
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio Inativa LTDA", "33333333000133", "INATIVO", DateTime.UtcNow)
        );
        await db.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Get_BuscaPorTermo_RetornaApenasAtivos()
    {
        var response = await _client.GetAsync("/api/v1/usuarios-musica?q=radio");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<UsuarioMusicaListResponse>();

        body.Should().NotBeNull();
        body!.Items.Should().HaveCount(2);
        body.Items.Should().OnlyContain(i => i.RazaoSocial.StartsWith("Radio"));
        body.Pagination.Total.Should().Be(2);
    }

    [Fact]
    public async Task Get_QComMenosDe2Caracteres_RetornaListaVazia()
    {
        var response = await _client.GetAsync("/api/v1/usuarios-musica?q=r");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<UsuarioMusicaListResponse>();

        body.Should().NotBeNull();
        body!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_BuscaPorCnpj_FiltraCorretamente()
    {
        var response = await _client.GetAsync("/api/v1/usuarios-musica?q=radio&cnpj=11111111000111");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<UsuarioMusicaListResponse>();

        body.Should().NotBeNull();
        body!.Items.Should().HaveCount(1);
        body.Items.Single().Cnpj.Should().Be("11111111000111");
    }

    [Fact]
    public async Task Get_Paginacao_RespeitaTamanho()
    {
        var response = await _client.GetAsync("/api/v1/usuarios-musica?q=radio&size=1&page=1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<UsuarioMusicaListResponse>();

        body.Should().NotBeNull();
        body!.Items.Should().HaveCount(1);
        body.Pagination.Size.Should().Be(1);
        body.Pagination.TotalPages.Should().Be(2);
    }

    private record UsuarioMusicaListResponse(
        List<UsuarioMusicaSnapshotResponse> Items,
        PaginationResponse Pagination);

    private record UsuarioMusicaSnapshotResponse(Guid Id, string RazaoSocial, string Cnpj);
    private record PaginationResponse(int Page, int Size, int Total, int TotalPages);
}
