using System.Net;
using System.Text.Json;
using AwesomeAssertions;
using Cadastro.API.Infrastructure;
using Cadastro.Application.Common.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cadastro.UnitTests.Infrastructure;

public class GlobalExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_ComAutenticacaoTitularException_DeveRetornar401()
    {
        var handler = new GlobalExceptionHandler(new NullLogger<GlobalExceptionHandler>());
        var context = new DefaultHttpContext();
        var exception = new AutenticacaoTitularException();

        var result = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        result.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task TryHandleAsync_ComAutenticacaoTitularException_DeveUsarMensagemGenerica()
    {
        var handler = new GlobalExceptionHandler(new NullLogger<GlobalExceptionHandler>());
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var exception = new AutenticacaoTitularException("motivo interno que não deve vazar");

        await handler.TryHandleAsync(context, exception, CancellationToken.None);

        context.Response.Body.Position = 0;
        var problemDetails = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body);
        problemDetails.GetProperty("detail").GetString().Should().Be("Credenciais inválidas");
        problemDetails.GetProperty("status").GetInt32().Should().Be(401);
    }
}
