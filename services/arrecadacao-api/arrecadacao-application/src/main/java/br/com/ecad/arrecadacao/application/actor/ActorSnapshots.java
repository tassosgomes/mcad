package br.com.ecad.arrecadacao.application.actor;

import java.util.Objects;

public final class ActorSnapshots {

    private ActorSnapshots() {
    }

    public static ActorSnapshot legacy(String author) {
        String label = requireText(author, "author must not be blank");
        return new ActorSnapshot(label, label, null, null, null);
    }

    public static String labelOf(ActorSnapshot actor) {
        return requireText(Objects.requireNonNull(actor, "actor must not be null").label(),
                "actor label must not be blank");
    }

    public static String subjectOf(ActorSnapshot actor) {
        return requireText(Objects.requireNonNull(actor, "actor must not be null").subject(),
                "actor subject must not be blank");
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}
