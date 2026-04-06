package br.com.ecad.arrecadacao.application.dto;

import java.util.List;

public record PageResponse<T>(
    List<T> items,
    PaginationInfo metadata
) {}
