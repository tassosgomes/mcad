package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;

public record BoletoDownloadResponse(
        String downloadUrl,
        Instant expiresAt
) {}
