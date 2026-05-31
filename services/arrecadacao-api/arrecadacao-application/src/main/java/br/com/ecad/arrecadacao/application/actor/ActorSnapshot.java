package br.com.ecad.arrecadacao.application.actor;

public record ActorSnapshot(
        String subject,
        String label,
        String username,
        String displayName,
        String email
) {
}
