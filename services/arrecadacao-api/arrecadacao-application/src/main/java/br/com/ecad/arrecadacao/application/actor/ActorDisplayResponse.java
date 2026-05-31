package br.com.ecad.arrecadacao.application.actor;

public record ActorDisplayResponse(
        String subject,
        String label,
        String username,
        String displayName,
        String email,
        String status
) {
}
