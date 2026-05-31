package br.com.ecad.arrecadacao.application.actor;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public interface IdentityUserLookup {

    Optional<IdentityUserProjection> findBySubject(String subject);

    default Map<String, IdentityUserProjection> findBySubjects(Collection<String> subjects) {
        Objects.requireNonNull(subjects, "subjects must not be null");

        Map<String, IdentityUserProjection> projections = new LinkedHashMap<>();
        for (String subject : subjects) {
            String normalizedSubject = normalize(subject);
            if (normalizedSubject == null || projections.containsKey(normalizedSubject)) {
                continue;
            }

            findBySubject(normalizedSubject).ifPresent(projection -> projections.put(normalizedSubject, projection));
        }

        return Map.copyOf(projections);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
