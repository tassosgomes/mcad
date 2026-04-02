namespace Identificacao.Application.Rubricas.Responses;

public record RubricaResponse(Guid Id, string Sigla, string Nome, bool ExigeClassificacao);
