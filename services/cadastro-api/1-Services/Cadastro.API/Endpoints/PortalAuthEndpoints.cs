using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Commands;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de autenticação do Portal do Titular (RF-01 a RF-07).
/// Prefixo <c>/api/v1/portal</c>. Auto-cadastro e login são anônimos;
/// alteração de senha exige token do scheme "Titular" (policy "PortalTitular").
/// </summary>
public static class PortalAuthEndpoints
{
    public static void MapPortalAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/portal")
            .WithTags("Portal do Titular — Autenticação");

        // POST /api/v1/portal/auto-cadastro — anônimo (RF-01).
        group.MapPost("/auto-cadastro", AutoCadastrar)
            .AllowAnonymous()
            .WithName("AutoCadastrarTitular")
            .WithSummary("Auto-cadastro do titular no Portal (valida CPF/CNPJ + CAE/IPI)");

        // POST /api/v1/portal/auth/login — anônimo (RF-05).
        group.MapPost("/auth/login", Login)
            .AllowAnonymous()
            .WithName("LoginTitular")
            .WithSummary("Autenticar titular via CPF/CNPJ + senha (emite JWT próprio)");

        // PUT /api/v1/portal/me/senha — exige token do titular (RF-07).
        group.MapPut("/me/senha", AlterarSenha)
            .RequireAuthorization("PortalTitular")
            .WithName("AlterarSenhaTitular")
            .WithSummary("Alterar senha do titular autenticado");
    }

    private static async Task<IResult> AutoCadastrar(
        [FromServices] IDispatcher dispatcher,
        [FromBody] AutoCadastroTitularRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AutoCadastroTitularCommand(request.Documento, request.CaeIpi, request.Senha);
        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Created($"/api/v1/portal/me", result);
    }

    private static async Task<IResult> Login(
        [FromServices] IDispatcher dispatcher,
        [FromBody] LoginTitularRequest request,
        CancellationToken cancellationToken)
    {
        var command = new LoginTitularCommand(request.Documento, request.Senha);
        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> AlterarSenha(
        [FromServices] IDispatcher dispatcher,
        [FromServices] ICurrentTitular currentTitular,
        [FromBody] AlterarSenhaRequest request,
        CancellationToken cancellationToken)
    {
        if (!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty)
        {
            return Results.Unauthorized();
        }

        var command = new AlterarSenhaCommand(
            currentTitular.TitularId,
            request.SenhaAtual,
            request.NovaSenha);

        await dispatcher.SendAsync(command, cancellationToken);
        return Results.NoContent();
    }
}

/// <summary>Body do auto-cadastro (RF-01).</summary>
public record AutoCadastroTitularRequest(
    string Documento,
    string CaeIpi,
    string Senha);

/// <summary>Body do login (RF-05).</summary>
public record LoginTitularRequest(
    string Documento,
    string Senha);

/// <summary>Body da alteração de senha (RF-07). TitularId vem do token.</summary>
public record AlterarSenhaRequest(
    string SenhaAtual,
    string NovaSenha);
