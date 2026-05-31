package br.com.ecad.arrecadacao.application.actor;

public record CurrentActor(
        String subject,
        String username,
        String displayName,
        String email
) {
}
