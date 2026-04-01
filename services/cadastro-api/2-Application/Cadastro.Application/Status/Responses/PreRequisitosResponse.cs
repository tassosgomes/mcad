using Cadastro.Domain.Services;

namespace Cadastro.Application.Status.Responses;

public record PreRequisitosResponse(
    string Type,
    string Title,
    int Status,
    string Detail,
    IReadOnlyList<PreRequisito> Pendencias
);
