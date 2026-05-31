package br.com.ecad.arrecadacao.application.actor;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ActorDisplayResolver {

    private static final Logger LOGGER = LoggerFactory.getLogger(ActorDisplayResolver.class);

    private final IdentityUserLookup identityUserLookup;

    public ActorDisplayResolver(IdentityUserLookup identityUserLookup) {
        this.identityUserLookup = Objects.requireNonNull(identityUserLookup, "identityUserLookup must not be null");
    }

    public ActorSnapshot snapshotFrom(CurrentActor actor) {
        Objects.requireNonNull(actor, "actor must not be null");
        String subject = requireText(actor.subject(), "actor subject must not be blank");

        Optional<IdentityUserProjection> projection = findProjectionSafely(subject);
        if (projection.isPresent()) {
            IdentityUserProjection user = projection.get();
            return new ActorSnapshot(
                    subject,
                    buildLabel(LabelCandidate.from(user, subject, null)),
                    trimToNull(user.username()),
                    trimToNull(user.displayName()),
                    trimToNull(user.email()));
        }

        return new ActorSnapshot(
                subject,
                buildLabel(LabelCandidate.from(actor, subject, null)),
                trimToNull(actor.username()),
                trimToNull(actor.displayName()),
                trimToNull(actor.email()));
    }

    public ActorDisplayResponse resolve(String subject, String legacyLabel) {
        String normalizedSubject = trimToNull(subject);
        if (normalizedSubject == null) {
            return unknownResponse(null, legacyLabel, null);
        }

        Optional<IdentityUserProjection> projection = findProjectionSafely(normalizedSubject);
        if (projection.isEmpty()) {
            LOGGER.warn("Actor projection not found for subject={}", normalizedSubject);
            return unknownResponse(normalizedSubject, legacyLabel, normalizedSubject);
        }

        return responseFromProjection(normalizedSubject, legacyLabel, projection.get());
    }

    public List<ActorDisplayResponse> resolveAll(Collection<ActorSnapshot> snapshots) {
        Objects.requireNonNull(snapshots, "snapshots must not be null");
        if (snapshots.isEmpty()) {
            return List.of();
        }

        Map<String, IdentityUserProjection> projectionsBySubject = findProjectionsSafely(snapshots);

        return snapshots.stream()
                .map(snapshot -> resolve(snapshot, projectionsBySubject))
                .toList();
    }

    private ActorDisplayResponse resolve(
            ActorSnapshot snapshot,
            Map<String, IdentityUserProjection> projectionsBySubject
    ) {
        String subject = trimToNull(snapshot.subject());
        if (subject == null) {
            return unknownResponse(null, snapshot.label(), null);
        }

        IdentityUserProjection projection = projectionsBySubject.get(subject);
        if (projection == null) {
            LOGGER.warn("Actor projection not found for subject={}", subject);
            return unknownResponse(subject, snapshot.label(), subject);
        }

        return responseFromProjection(subject, snapshot.label(), projection);
    }

    private Map<String, IdentityUserProjection> findProjectionsSafely(Collection<ActorSnapshot> snapshots) {
        Set<String> subjects = new LinkedHashSet<>();
        for (ActorSnapshot snapshot : snapshots) {
            String subject = trimToNull(snapshot.subject());
            if (subject != null) {
                subjects.add(subject);
            }
        }

        if (subjects.isEmpty()) {
            return Map.of();
        }

        try {
            Map<String, IdentityUserProjection> projections = identityUserLookup.findBySubjects(subjects);
            return normalizeProjectionKeys(projections);
        } catch (RuntimeException ex) {
            LOGGER.warn("Actor projection batch lookup failed for subjectCount={}", subjects.size(), ex);
            return Map.of();
        }
    }

    private Optional<IdentityUserProjection> findProjectionSafely(String subject) {
        try {
            return identityUserLookup.findBySubject(subject);
        } catch (RuntimeException ex) {
            LOGGER.warn("Actor projection lookup failed for subject={}", subject, ex);
            return Optional.empty();
        }
    }

    private Map<String, IdentityUserProjection> normalizeProjectionKeys(Map<String, IdentityUserProjection> projections) {
        if (projections == null || projections.isEmpty()) {
            return Map.of();
        }

        Map<String, IdentityUserProjection> normalized = new HashMap<>();
        projections.forEach((subject, projection) -> {
            String normalizedSubject = trimToNull(subject);
            if (normalizedSubject != null && projection != null) {
                normalized.put(normalizedSubject, projection);
            }
        });
        return Map.copyOf(normalized);
    }

    private ActorDisplayResponse responseFromProjection(
            String subject,
            String legacyLabel,
            IdentityUserProjection projection
    ) {
        String label = preferLegacyLabel(legacyLabel)
                .orElseGet(() -> buildLabel(LabelCandidate.from(projection, subject, null)));

        return new ActorDisplayResponse(
                subject,
                label,
                trimToNull(projection.username()),
                trimToNull(projection.displayName()),
                trimToNull(projection.email()),
                statusOf(projection).name());
    }

    private ActorDisplayResponse unknownResponse(String subject, String legacyLabel, String subjectFallback) {
        String label = preferLegacyLabel(legacyLabel)
                .orElseGet(() -> trimToNull(subjectFallback));

        return new ActorDisplayResponse(
                subject,
                label,
                null,
                null,
                null,
                ActorDisplayStatus.DESCONHECIDO.name());
    }

    private Optional<String> preferLegacyLabel(String legacyLabel) {
        return Optional.ofNullable(trimToNull(legacyLabel));
    }

    private ActorDisplayStatus statusOf(IdentityUserProjection projection) {
        if (projection.deletedAtUtc() != null) {
            return ActorDisplayStatus.REMOVIDO;
        }
        if (projection.suspended()) {
            return ActorDisplayStatus.SUSPENSO;
        }
        return ActorDisplayStatus.ATIVO;
    }

    private String buildLabel(LabelCandidate candidate) {
        String normalizedDisplayName = trimToNull(candidate.displayName());
        String normalizedUsername = trimToNull(candidate.username());
        if (normalizedDisplayName != null && normalizedUsername != null) {
            return normalizedDisplayName + " (" + normalizedUsername + ")";
        }
        if (normalizedUsername != null) {
            return normalizedUsername;
        }

        String normalizedEmail = trimToNull(candidate.email());
        if (normalizedEmail != null) {
            return normalizedEmail;
        }

        String normalizedSubject = trimToNull(candidate.subject());
        if (normalizedSubject != null) {
            return normalizedSubject;
        }

        return trimToNull(candidate.fallbackLabel());
    }

    private String requireText(String value, String message) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            throw new IllegalArgumentException(message);
        }
        return normalizedValue;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record LabelCandidate(
            String displayName,
            String username,
            String email,
            String subject,
            String fallbackLabel
    ) {

        private static LabelCandidate from(
                IdentityUserProjection projection,
                String subject,
                String fallbackLabel
        ) {
            return new LabelCandidate(
                    projection.displayName(),
                    projection.username(),
                    projection.email(),
                    subject,
                    fallbackLabel);
        }

        private static LabelCandidate from(
                CurrentActor actor,
                String subject,
                String fallbackLabel
        ) {
            return new LabelCandidate(
                    actor.displayName(),
                    actor.username(),
                    actor.email(),
                    subject,
                    fallbackLabel);
        }
    }
}
