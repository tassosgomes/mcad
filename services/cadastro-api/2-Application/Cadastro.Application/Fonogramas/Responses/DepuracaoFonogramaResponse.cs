namespace Cadastro.Application.Fonogramas.Responses;

public record DepuracaoFonogramaResponse(
    FonogramaResponse FonogramaDepurado,
    FonogramaResponse NovoFonograma
);
