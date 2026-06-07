package br.com.ecad.distribuicao.application.queries;

import java.util.UUID;

public record ConsultarDemonstrativoTitularQuery(
    UUID processoId,
    UUID titularId
) {}
