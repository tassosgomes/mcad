package br.com.ecad.arrecadacao.application.actor;

import java.time.Instant;

public record IdentityUserProjection(
        String subject,
        String username,
        String displayName,
        String email,
        boolean suspended,
        Instant deletedAtUtc
) {
}
