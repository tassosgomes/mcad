package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "historico_status_licenca", schema = "arrecadacao")
public class HistoricoStatusLicenca {
    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 15)
    private StatusLicenca statusAnterior;  // null na criacao inicial

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", length = 15, nullable = false)
    private StatusLicenca statusNovo;

    @Column(name = "justificativa", length = 500, nullable = false)
    private String justificativa;

    @Column(name = "autor", length = 100, nullable = false)
    private String autor;

    @Column(name = "data", nullable = false)
    private Instant data;

    protected HistoricoStatusLicenca() {}

    public static HistoricoStatusLicenca criar(UUID licencaId,
            StatusLicenca statusAnterior, StatusLicenca statusNovo,
            String justificativa, String autor) {
        Objects.requireNonNull(licencaId, "licencaId e obrigatorio");
        Objects.requireNonNull(statusNovo, "statusNovo e obrigatorio");
        Objects.requireNonNull(justificativa, "justificativa e obrigatoria");
        if (justificativa.trim().length() < 10) {
            throw new IllegalArgumentException("Justificativa deve ter no minimo 10 caracteres");
        }
        var historico = new HistoricoStatusLicenca();
        historico.id = UUID.randomUUID();
        historico.licencaId = licencaId;
        historico.statusAnterior = statusAnterior;
        historico.statusNovo = statusNovo;
        historico.justificativa = justificativa;
        historico.autor = autor;
        historico.data = Instant.now();
        return historico;
    }

    public UUID getId() { return id; }
    public UUID getLicencaId() { return licencaId; }
    public StatusLicenca getStatusAnterior() { return statusAnterior; }
    public StatusLicenca getStatusNovo() { return statusNovo; }
    public String getJustificativa() { return justificativa; }
    public String getAutor() { return autor; }
    public Instant getData() { return data; }
}
