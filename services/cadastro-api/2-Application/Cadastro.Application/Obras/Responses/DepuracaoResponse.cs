namespace Cadastro.Application.Obras.Responses;

public record DepuracaoResponse(
    ObraResponse ObraDepurada,
    ObraResponse NovaObra
);
