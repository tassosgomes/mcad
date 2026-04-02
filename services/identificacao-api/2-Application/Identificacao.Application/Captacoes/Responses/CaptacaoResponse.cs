using Identificacao.Application.Rubricas.Responses;

namespace Identificacao.Application.Captacoes.Responses;

public record AnalistaResumoResponse(Guid Id, string Nome);
public record ResumoExecucoesResponse(int Total, int Identificadas, int Pendentes);

public record CaptacaoResponse(
    Guid Id,
    RubricaResponse Rubrica,
    string Periodo,
    string UsuarioDeMusica,
    string Status,
    AnalistaResumoResponse AnalistaResponsavel,
    DateTime CriadoEm,
    DateTime AtualizadoEm
);

public record CaptacaoDetalheResponse(
    Guid Id,
    RubricaResponse Rubrica,
    string Periodo,
    string UsuarioDeMusica,
    string Status,
    AnalistaResumoResponse AnalistaResponsavel,
    ResumoExecucoesResponse ResumoExecucoes,
    DateTime CriadoEm,
    DateTime AtualizadoEm
);
