package br.com.ecad.arrecadacao.application.ports;

import java.time.Instant;

public record StorageDownloadData(
        String downloadUrl,
        Instant expiresAt
) {}
