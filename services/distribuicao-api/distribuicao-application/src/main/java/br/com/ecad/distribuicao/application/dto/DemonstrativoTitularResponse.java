package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.util.List;
import java.util.UUID;

public record DemonstrativoTitularResponse(
    UUID processoId,
    StatusProcesso statusProcesso,
    String rubricaSigla,
    String periodo,
    UUID titularId,
    String titularNome,
    ResumoFinanceiroResponse resumo,
    List<CreditoCalculadoItem> creditosPeriodo,
    List<CreditoRetidoItem> creditosRetidos,
    List<CreditoLiberadoItem> creditosLiberados,
    List<Object> ajustesEstorno,
    String totalAjustesEstorno
) {}
