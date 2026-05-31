package br.com.ecad.arrecadacao.application.actor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(MockitoExtension.class)
@ExtendWith(OutputCaptureExtension.class)
class ActorDisplayResolverTest {

    @Mock
    private IdentityUserLookup identityUserLookup;

    private ActorDisplayResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ActorDisplayResolver(identityUserLookup);
    }

    @Test
    void snapshotFrom_WithSynchronizedUser_ShouldPreferProjectionData() {
        // Arrange
        when(identityUserLookup.findBySubject("logto-user-1"))
                .thenReturn(Optional.of(activeUser("logto-user-1", "maria.silva", "Maria Silva", "maria@mcad.dev")));

        CurrentActor actor = new CurrentActor("logto-user-1", "old.username", "Old Name", "old@mcad.dev");

        // Act
        ActorSnapshot snapshot = resolver.snapshotFrom(actor);

        // Assert
        assertThat(snapshot.subject()).isEqualTo("logto-user-1");
        assertThat(snapshot.label()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(snapshot.username()).isEqualTo("maria.silva");
        assertThat(snapshot.displayName()).isEqualTo("Maria Silva");
        assertThat(snapshot.email()).isEqualTo("maria@mcad.dev");
    }

    @Test
    void snapshotFrom_WhenLookupMissing_ShouldUseCurrentActorFallback() {
        // Arrange
        when(identityUserLookup.findBySubject("logto-user-1")).thenReturn(Optional.empty());
        CurrentActor actor = new CurrentActor("logto-user-1", "maria.silva", "Maria Silva", "maria@mcad.dev");

        // Act
        ActorSnapshot snapshot = resolver.snapshotFrom(actor);

        // Assert
        assertThat(snapshot.label()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(snapshot.username()).isEqualTo("maria.silva");
        assertThat(snapshot.displayName()).isEqualTo("Maria Silva");
        assertThat(snapshot.email()).isEqualTo("maria@mcad.dev");
    }

    @Test
    void snapshotFrom_WithBlankSubject_ShouldThrowException() {
        // Arrange
        CurrentActor actor = new CurrentActor(" ", "maria.silva", "Maria Silva", "maria@mcad.dev");

        // Act / Assert
        assertThatThrownBy(() -> resolver.snapshotFrom(actor))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actor subject must not be blank");
    }

    @Test
    void resolve_WithFrozenLabelAndActiveProjection_ShouldPreserveFrozenLabel() {
        // Arrange
        when(identityUserLookup.findBySubject("logto-user-1"))
                .thenReturn(Optional.of(activeUser("logto-user-1", "new.login", "New Name", "new@mcad.dev")));

        // Act
        ActorDisplayResponse response = resolver.resolve("logto-user-1", "Maria Silva (maria.silva)");

        // Assert
        assertThat(response.subject()).isEqualTo("logto-user-1");
        assertThat(response.label()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(response.username()).isEqualTo("new.login");
        assertThat(response.displayName()).isEqualTo("New Name");
        assertThat(response.email()).isEqualTo("new@mcad.dev");
        assertThat(response.status()).isEqualTo("ATIVO");
    }

    @Test
    void resolve_WithSuspendedProjection_ShouldReturnSuspenso() {
        // Arrange
        IdentityUserProjection projection = new IdentityUserProjection(
                "logto-user-1",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev",
                true,
                null);
        when(identityUserLookup.findBySubject("logto-user-1")).thenReturn(Optional.of(projection));

        // Act
        ActorDisplayResponse response = resolver.resolve("logto-user-1", null);

        // Assert
        assertThat(response.label()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(response.status()).isEqualTo("SUSPENSO");
    }

    @Test
    void resolve_WithDeletedProjection_ShouldReturnRemovido() {
        // Arrange
        IdentityUserProjection projection = new IdentityUserProjection(
                "logto-user-1",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev",
                false,
                Instant.parse("2026-05-01T10:15:30Z"));
        when(identityUserLookup.findBySubject("logto-user-1")).thenReturn(Optional.of(projection));

        // Act
        ActorDisplayResponse response = resolver.resolve("logto-user-1", null);

        // Assert
        assertThat(response.label()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(response.status()).isEqualTo("REMOVIDO");
    }

    @Test
    void resolve_WithMissingSubject_ShouldReturnUnknownLegacyActor() {
        // Act
        ActorDisplayResponse response = resolver.resolve(null, "autor legado");

        // Assert
        assertThat(response.subject()).isNull();
        assertThat(response.label()).isEqualTo("autor legado");
        assertThat(response.status()).isEqualTo("DESCONHECIDO");
        verify(identityUserLookup, never()).findBySubject(null);
    }

    @Test
    void resolve_WhenLookupFails_ShouldReturnSafeFallbackAndWarn(CapturedOutput output) {
        // Arrange
        when(identityUserLookup.findBySubject("logto-user-1"))
                .thenThrow(new IllegalStateException("database unavailable"));

        // Act
        ActorDisplayResponse response = resolver.resolve("logto-user-1", "autor legado");

        // Assert
        assertThat(response.subject()).isEqualTo("logto-user-1");
        assertThat(response.label()).isEqualTo("autor legado");
        assertThat(response.status()).isEqualTo("DESCONHECIDO");
        assertThat(output.getAll())
                .contains("Actor projection lookup failed for subject=logto-user-1");
    }

    @Test
    void resolveAll_WhenProjectionIsMissing_ShouldReturnSafeFallbackAndWarn(CapturedOutput output) {
        // Arrange
        List<ActorSnapshot> snapshots = List.of(
                new ActorSnapshot("missing-subject", "Autor congelado", null, null, null));
        when(identityUserLookup.findBySubjects(ArgumentMatchers.<Collection<String>>any()))
                .thenReturn(Map.of());

        // Act
        List<ActorDisplayResponse> responses = resolver.resolveAll(snapshots);

        // Assert
        assertThat(responses)
                .singleElement()
                .satisfies(response -> {
                    assertThat(response.subject()).isEqualTo("missing-subject");
                    assertThat(response.label()).isEqualTo("Autor congelado");
                    assertThat(response.status()).isEqualTo("DESCONHECIDO");
                });
        assertThat(output.getAll())
                .contains("Actor projection not found for subject=missing-subject");
    }

    @Test
    void resolve_WithProjectionWithoutFrozenLabel_ShouldUseFallbackOrder() {
        // Arrange
        when(identityUserLookup.findBySubject("subject-username"))
                .thenReturn(Optional.of(activeUser("subject-username", "maria.silva", null, "maria@mcad.dev")));
        when(identityUserLookup.findBySubject("subject-email"))
                .thenReturn(Optional.of(activeUser("subject-email", null, null, "maria@mcad.dev")));
        when(identityUserLookup.findBySubject("subject-only"))
                .thenReturn(Optional.of(activeUser("subject-only", null, null, null)));

        // Act
        ActorDisplayResponse usernameResponse = resolver.resolve("subject-username", null);
        ActorDisplayResponse emailResponse = resolver.resolve("subject-email", null);
        ActorDisplayResponse subjectResponse = resolver.resolve("subject-only", null);

        // Assert
        assertThat(usernameResponse.label()).isEqualTo("maria.silva");
        assertThat(emailResponse.label()).isEqualTo("maria@mcad.dev");
        assertThat(subjectResponse.label()).isEqualTo("subject-only");
    }

    @Test
    @SuppressWarnings("unchecked")
    void resolveAll_WithRepeatedSubjects_ShouldUseBatchLookupAndPreserveFrozenLabels() {
        // Arrange
        List<ActorSnapshot> snapshots = List.of(
                new ActorSnapshot("logto-user-1", "Maria antiga", null, null, null),
                new ActorSnapshot("logto-user-1", "Maria atual", null, null, null),
                new ActorSnapshot(null, "autor legado", null, null, null));
        when(identityUserLookup.findBySubjects(ArgumentMatchers.<Collection<String>>any()))
                .thenReturn(Map.of("logto-user-1", activeUser("logto-user-1", "maria.silva", "Maria Silva", null)));

        // Act
        List<ActorDisplayResponse> responses = resolver.resolveAll(snapshots);

        // Assert
        assertThat(responses).extracting(ActorDisplayResponse::label)
                .containsExactly("Maria antiga", "Maria atual", "autor legado");
        assertThat(responses).extracting(ActorDisplayResponse::status)
                .containsExactly("ATIVO", "ATIVO", "DESCONHECIDO");

        ArgumentCaptor<Collection<String>> subjectsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(identityUserLookup).findBySubjects(subjectsCaptor.capture());
        assertThat(subjectsCaptor.getValue()).containsExactly("logto-user-1");
        verify(identityUserLookup, never()).findBySubject("logto-user-1");
    }

    private IdentityUserProjection activeUser(
            String subject,
            String username,
            String displayName,
            String email
    ) {
        return new IdentityUserProjection(subject, username, displayName, email, false, null);
    }
}
