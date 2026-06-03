package br.com.ecad.arrecadacao.infra.events;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@ExtendWith(MockitoExtension.class)
class JdbcIdentityUserLookupTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    private JdbcIdentityUserLookup lookup;

    @BeforeEach
    void setUp() {
        lookup = new JdbcIdentityUserLookup(jdbcTemplate, namedParameterJdbcTemplate);
    }

    @Test
    void findBySubject_WithBlankSubject_ShouldReturnEmptyWithoutQuery() {
        // Act
        var result = lookup.findBySubject(" ");

        // Assert
        assertThat(result).isEmpty();
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void findBySubject_WithExistingSubject_ShouldReturnProjection() {
        // Arrange
        IdentityUserProjection projection = activeUser("logto-user-1");
        when(jdbcTemplate.query(
                anyString(),
                org.mockito.ArgumentMatchers.<RowMapper<IdentityUserProjection>>any(),
                eq("logto-user-1")))
                .thenReturn(List.of(projection));

        // Act
        var result = lookup.findBySubject(" logto-user-1 ");

        // Assert
        assertThat(result).contains(projection);
    }

    @Test
    @SuppressWarnings("unchecked")
    void findBySubjects_WithDuplicateAndBlankSubjects_ShouldQueryDistinctSubjects() {
        // Arrange
        IdentityUserProjection projection = activeUser("logto-user-1");
        when(namedParameterJdbcTemplate.query(
                anyString(),
                org.mockito.ArgumentMatchers.any(MapSqlParameterSource.class),
                org.mockito.ArgumentMatchers.<RowMapper<IdentityUserProjection>>any()))
                .thenReturn(List.of(projection));

        // Act
        Map<String, IdentityUserProjection> result = lookup.findBySubjects(List.of(
                " logto-user-1 ",
                "",
                "logto-user-1",
                "logto-user-2"));

        // Assert
        assertThat(result).containsEntry("logto-user-1", projection);

        ArgumentCaptor<MapSqlParameterSource> parameterCaptor =
                ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).query(
                anyString(),
                parameterCaptor.capture(),
                org.mockito.ArgumentMatchers.<RowMapper<IdentityUserProjection>>any());

        Object subjects = parameterCaptor.getValue().getValue("subjects");
        assertThat((Set<String>) subjects).containsExactly("logto-user-1", "logto-user-2");
    }

    @Test
    void constructor_ForSpringBeanInstantiation_ShouldBeAutowired() throws NoSuchMethodException {
        // Arrange
        var constructor = JdbcIdentityUserLookup.class.getConstructor(JdbcTemplate.class);

        // Assert
        assertThat(constructor.getAnnotation(Autowired.class)).isNotNull();
    }

    private IdentityUserProjection activeUser(String subject) {
        return new IdentityUserProjection(
                subject,
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev",
                false,
                null);
    }
}
