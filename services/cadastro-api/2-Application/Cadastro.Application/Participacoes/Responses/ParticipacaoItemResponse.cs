using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Participacoes.Responses;

public record ParticipacaoItemResponse(
    Guid Id,
    TitularResumoResponse Titular,
    string Categoria,
    decimal? Percentual,
    bool Editavel
);
