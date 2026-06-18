using Ecad.Authz.Sdk;
using FluentValidation;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Infrastructure;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problemDetails = new ProblemDetails
        {
            Instance = httpContext.Request.Path
        };

        switch (exception)
        {
            case AuthzServiceUnavailableException:
                _logger.LogError(exception, "Authorization service unavailable.");
                problemDetails.Status = StatusCodes.Status503ServiceUnavailable;
                problemDetails.Title = "Authorization Service Unavailable";
                problemDetails.Detail = "The authorization service is temporarily unavailable. Please try again.";
                break;

            case DomainException domainEx:
                _logger.LogWarning(exception, "Domain validation error.");
                problemDetails.Status = StatusCodes.Status422UnprocessableEntity;
                problemDetails.Title = "Unprocessable Entity";
                problemDetails.Detail = domainEx.Message;
                break;

            case PreRequisitosException preReqEx:
                _logger.LogInformation(exception, "Pre-requisites not met.");
                problemDetails.Status = StatusCodes.Status422UnprocessableEntity;
                problemDetails.Title = "Unprocessable Entity";
                problemDetails.Detail = preReqEx.Message;
                problemDetails.Extensions["code"] = preReqEx.Code;
                problemDetails.Extensions["itens"] = preReqEx.Itens;
                break;

            case NotFoundException notFoundEx:
                _logger.LogInformation(exception, "Resource not found.");
                problemDetails.Status = StatusCodes.Status404NotFound;
                problemDetails.Title = "Not Found";
                problemDetails.Detail = notFoundEx.Message;
                break;

            case ConflictException conflictEx:
                _logger.LogInformation(exception, "Resource conflict.");
                problemDetails.Status = StatusCodes.Status409Conflict;
                problemDetails.Title = "Conflict";
                problemDetails.Detail = conflictEx.Message;
                problemDetails.Extensions["code"] = conflictEx.ErrorCode;
                break;

            case ForbiddenException forbiddenEx:
                _logger.LogWarning(exception, "Access forbidden.");
                problemDetails.Status = StatusCodes.Status403Forbidden;
                problemDetails.Title = "Forbidden";
                problemDetails.Detail = forbiddenEx.Message;
                break;

            case ValidationException validationEx:
                _logger.LogWarning(exception, "Request validation error.");
                problemDetails.Status = StatusCodes.Status400BadRequest;
                problemDetails.Title = "Bad Request";
                problemDetails.Detail = "One or more validation errors occurred.";
                problemDetails.Extensions["errors"] = validationEx.Errors
                    .GroupBy(e => e.PropertyName, e => e.ErrorMessage)
                    .ToDictionary(g => g.Key, g => g.ToArray());
                break;

            case UnauthorizedAccessException authEx:
                _logger.LogWarning(exception, "Unauthorized access.");
                problemDetails.Status = StatusCodes.Status401Unauthorized;
                problemDetails.Title = "Unauthorized";
                problemDetails.Detail = authEx.Message;
                break;

            default:
                _logger.LogError(exception, "An unexpected error occurred.");
                problemDetails.Status = StatusCodes.Status500InternalServerError;
                problemDetails.Title = "Internal Server Error";
                problemDetails.Detail = "An unexpected error occurred. Please try again later.";
                break;
        }

        httpContext.Response.StatusCode = problemDetails.Status.Value;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
