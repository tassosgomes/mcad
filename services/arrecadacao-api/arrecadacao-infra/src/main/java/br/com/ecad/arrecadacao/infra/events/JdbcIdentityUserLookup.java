package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcIdentityUserLookup implements IdentityUserLookup {

    private static final String SELECT_COLUMNS = """
            SELECT
                logto_user_id,
                username,
                display_name,
                email,
                is_suspended,
                deleted_at_utc
            FROM arrecadacao.usuarios_identidade
            """;

    private static final String FIND_BY_SUBJECT_SQL = SELECT_COLUMNS + " WHERE logto_user_id = ?";

    private static final String FIND_BY_SUBJECTS_SQL =
            SELECT_COLUMNS + " WHERE logto_user_id IN (:subjects)";

    private static final RowMapper<IdentityUserProjection> ROW_MAPPER = JdbcIdentityUserLookup::mapRow;

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public JdbcIdentityUserLookup(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, new NamedParameterJdbcTemplate(jdbcTemplate));
    }

    JdbcIdentityUserLookup(
            JdbcTemplate jdbcTemplate,
            NamedParameterJdbcTemplate namedParameterJdbcTemplate
    ) {
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate must not be null");
        this.namedParameterJdbcTemplate = Objects.requireNonNull(
                namedParameterJdbcTemplate,
                "namedParameterJdbcTemplate must not be null");
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<IdentityUserProjection> findBySubject(String subject) {
        String normalizedSubject = trimToNull(subject);
        if (normalizedSubject == null) {
            return Optional.empty();
        }

        return jdbcTemplate.query(FIND_BY_SUBJECT_SQL, ROW_MAPPER, normalizedSubject)
                .stream()
                .findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, IdentityUserProjection> findBySubjects(Collection<String> subjects) {
        Set<String> normalizedSubjects = normalizeSubjects(subjects);
        if (normalizedSubjects.isEmpty()) {
            return Map.of();
        }

        var parameters = new MapSqlParameterSource("subjects", normalizedSubjects);
        return namedParameterJdbcTemplate.query(FIND_BY_SUBJECTS_SQL, parameters, ROW_MAPPER)
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        IdentityUserProjection::subject,
                        projection -> projection,
                        (first, ignored) -> first));
    }

    private static Set<String> normalizeSubjects(Collection<String> subjects) {
        Objects.requireNonNull(subjects, "subjects must not be null");

        Set<String> normalizedSubjects = new LinkedHashSet<>();
        for (String subject : subjects) {
            String normalizedSubject = trimToNull(subject);
            if (normalizedSubject != null) {
                normalizedSubjects.add(normalizedSubject);
            }
        }
        return normalizedSubjects;
    }

    private static IdentityUserProjection mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
        Timestamp deletedAt = resultSet.getTimestamp("deleted_at_utc");
        return new IdentityUserProjection(
                resultSet.getString("logto_user_id"),
                resultSet.getString("username"),
                resultSet.getString("display_name"),
                resultSet.getString("email"),
                resultSet.getBoolean("is_suspended"),
                deletedAt != null ? deletedAt.toInstant() : null);
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
