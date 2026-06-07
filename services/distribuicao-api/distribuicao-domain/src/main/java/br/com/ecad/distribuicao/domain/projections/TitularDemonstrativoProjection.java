package br.com.ecad.distribuicao.domain.projections;

import java.math.BigDecimal;
import java.util.UUID;

public record TitularDemonstrativoProjection(
    UUID titularId,
    String titularNome,
    BigDecimal totalCalculado,
    BigDecimal totalRetido,
    long quantidadeObras
) {}
