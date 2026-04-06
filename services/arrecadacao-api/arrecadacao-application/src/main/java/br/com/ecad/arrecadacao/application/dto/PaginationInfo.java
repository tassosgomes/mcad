package br.com.ecad.arrecadacao.application.dto;

public record PaginationInfo(
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
