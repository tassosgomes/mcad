package br.com.ecad.distribuicao.application.dto;

import java.util.UUID;

public record CreditoCalculadoItem(
    UUID obraId,
    String obraNome,
    UUID fonogramaId,
    String fonogramaNome,
    String categoria,
    String subcategoria,
    String percentual,
    String valorObra,
    String valorCredito
) {}
