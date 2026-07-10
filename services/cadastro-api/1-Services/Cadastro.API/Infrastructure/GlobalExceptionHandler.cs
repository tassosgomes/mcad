using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Repertorios;
using Cadastro.Domain.Exceptions;
using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Infrastructure;

/// <summary>
/// Global Exception Handler — captura exceções não tratadas e retorna ProblemDetails (RFC 7807).
/// Registrado em Program.cs via AddExceptionHandler.
/// Mapeamentos:
/// - AutenticacaoTitularException → 401 (mensagem genérica "Credenciais inválidas" — RF-06)
/// - NotFoundException → 404
/// - ConflictException (Application) → 409
/// - StatusConflictException (Domain) → 409
/// - ValidationException → 400
/// - DomainException → 422
/// - RepertorioIswcIndisponivelException → 502 (code: "ISWC_INDISPONIVEL")
/// - ExternalServiceException → 502
/// - Exception → 500
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(
            exception,
            "Unhandled exception: {ExceptionType} — {Message}",
            exception.GetType().Name,
            exception.Message);

        var (statusCode, title) = exception switch
        {
            AuthzServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Authorization Service Unavailable"),
            AutenticacaoTitularException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            StatusConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            Cadastro.Application.Common.Exceptions.ValidationException => (StatusCodes.Status400BadRequest, "Validation Error"),
            DomainException => (StatusCodes.Status422UnprocessableEntity, "Unprocessable Entity"),
            ExternalServiceException => (StatusCodes.Status502BadGateway, "Bad Gateway"),
            DepuracaoNecessariaException => (StatusCodes.Status409Conflict, "Depuração Necessária"),
            PreRequisitosException => (StatusCodes.Status422UnprocessableEntity, "Pré-requisitos não atendidos"),
            RepertorioIswcIndisponivelException => (StatusCodes.Status502BadGateway, "Serviço ISWC indisponível"),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
        };
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        };

        if (exception is Cadastro.Application.Common.Exceptions.ValidationException validationException)
        {
            var firstErrorMessage = validationException.Errors
                .SelectMany(entry => entry.Value)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(firstErrorMessage))
            {
                problemDetails.Detail = firstErrorMessage;
            }

            problemDetails.Extensions["errors"] = validationException.Errors;
        }

        // RF-06: sempre mensagem genérica — nunca revela se CPF ou senha falhou.
        if (exception is AutenticacaoTitularException)
        {
            problemDetails.Detail = "Credenciais inválidas";
        }

        if (exception is DepuracaoNecessariaException depException)
        {
            problemDetails.Extensions["code"] = depException.Code;
        }

        if (exception is RepertorioIswcIndisponivelException iswcException)
        {
            problemDetails.Extensions["code"] = iswcException.ErrorCode;
            problemDetails.Detail = "Serviço ISWC indisponível no momento. Tente novamente ou salve como pendente.";
        }

        if (exception is PreRequisitosException preReqException)
        {
            var response = new Cadastro.Application.Status.Responses.PreRequisitosResponse(
                "https://tools.ietf.org/html/rfc9110#section-15.5.21", // 422 Type
                title,
                statusCode,
                exception.Message,
                preReqException.Pendencias
            );
            
            httpContext.Response.StatusCode = statusCode;
            await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);
            return true;
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}

