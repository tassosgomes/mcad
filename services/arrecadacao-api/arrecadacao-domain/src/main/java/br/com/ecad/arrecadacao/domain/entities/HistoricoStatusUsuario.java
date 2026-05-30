package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "historico_status_usuario", schema = "arrecadacao")
public class HistoricoStatusUsuario {
    @Id
    private UUID id;

    @Column(name = "usuario_musica_id", nullable = false)
    private UUID usuarioMusicaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 10)
    private StatusUsuarioMusica statusAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", nullable = false, length = 10)
    private StatusUsuarioMusica statusNovo;

    @Column(nullable = false, length = 500)
    private String justificativa;

    @Column(nullable = false, length = 100)
    private String autor;

    @Column(name = "ator_subject", length = 128)
    private String atorSubject;

    @Column(name = "autor_rotulo", length = 512)
    private String autorRotulo;

    @Column(nullable = false)
    private Instant data;

    protected HistoricoStatusUsuario() {}

    public static HistoricoStatusUsuario criar(UUID usuarioMusicaId, StatusUsuarioMusica statusAnterior,
                                               StatusUsuarioMusica statusNovo, String justificativa, String autor) {
        if (justificativa == null || justificativa.length() < 10) {
            throw new IllegalArgumentException("justificativa must have at least 10 characters");
        }
        HistoricoStatusUsuario h = new HistoricoStatusUsuario();
        h.id = UUID.randomUUID();
        h.usuarioMusicaId = Objects.requireNonNull(usuarioMusicaId, "usuarioMusicaId must not be null");
        h.statusAnterior = statusAnterior;
        h.statusNovo = Objects.requireNonNull(statusNovo, "statusNovo must not be null");
        h.justificativa = justificativa;
        h.autor = Objects.requireNonNull(autor, "autor must not be null");
        h.data = Instant.now();
        return h;
    }

    public static HistoricoStatusUsuario criar(UUID usuarioMusicaId, StatusUsuarioMusica statusAnterior,
                                               StatusUsuarioMusica statusNovo, String justificativa,
                                               String atorSubject, String autorRotulo) {
        String rotulo = requireText(autorRotulo, "autorRotulo must not be blank");
        String subject = requireText(atorSubject, "atorSubject must not be blank");
        HistoricoStatusUsuario historico = criar(usuarioMusicaId, statusAnterior, statusNovo, justificativa, rotulo);
        historico.atorSubject = subject;
        historico.autorRotulo = rotulo;
        return historico;
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    public UUID getId() { return id; }
    public UUID getUsuarioMusicaId() { return usuarioMusicaId; }
    public StatusUsuarioMusica getStatusAnterior() { return statusAnterior; }
    public StatusUsuarioMusica getStatusNovo() { return statusNovo; }
    public String getJustificativa() { return justificativa; }
    public String getAutor() { return autor; }
    public String getAtorSubject() { return atorSubject; }
    public String getAutorRotulo() { return autorRotulo; }
    public Instant getData() { return data; }
}
