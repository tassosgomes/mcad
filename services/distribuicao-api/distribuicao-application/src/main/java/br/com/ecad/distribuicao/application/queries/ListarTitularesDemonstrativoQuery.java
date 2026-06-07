package br.com.ecad.distribuicao.application.queries;

import java.util.UUID;

public record ListarTitularesDemonstrativoQuery(
    UUID processoId,
    String titularNome,
    int page,
    int size,
    String sort
) {}
