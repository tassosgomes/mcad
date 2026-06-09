package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "licencas", schema = "arrecadacao")
public class Licenca {
    @Id
    private UUID id;

    @Column(name = "usuario_musica_id", nullable = false)
    private UUID usuarioMusicaId;

    @Column(name = "rubrica_id", nullable = false)
    private UUID rubricaId;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;  // nullable = vigencia indefinida

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15, nullable = false)
    private StatusLicenca status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    // Relacionamentos somente leitura para suportar Specification com join
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_musica_id", insertable = false, updatable = false)
    private UsuarioMusica usuarioMusica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubrica_id", insertable = false, updatable = false)
    private Rubrica rubrica;

    protected Licenca() {}

    public static Licenca criar(UUID usuarioMusicaId, UUID rubricaId,
                                LocalDate dataInicio, LocalDate dataFim) {
        Objects.requireNonNull(usuarioMusicaId, "usuarioMusicaId e obrigatorio");
        Objects.requireNonNull(rubricaId, "rubricaId e obrigatorio");
        Objects.requireNonNull(dataInicio, "dataInicio e obrigatorio");
        if (dataInicio.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("dataInicio nao pode ser anterior a hoje");
        }
        if (dataFim != null && !dataFim.isAfter(dataInicio)) {
            throw new IllegalArgumentException("dataFim deve ser posterior a dataInicio");
        }
        var licenca = new Licenca();
        licenca.id = UUID.randomUUID();
        licenca.usuarioMusicaId = usuarioMusicaId;
        licenca.rubricaId = rubricaId;
        licenca.dataInicio = dataInicio;
        licenca.dataFim = dataFim;
        licenca.status = StatusLicenca.ATIVA;
        licenca.criadoEm = Instant.now();
        licenca.atualizadoEm = Instant.now();
        return licenca;
    }

    public HistoricoStatusLicenca suspender(String justificativa, String autor) {
        if (status != StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Somente licenças ATIVAS podem ser suspensas");
        }
        var anterior = this.status;
        this.status = StatusLicenca.SUSPENSA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.SUSPENSA, justificativa, autor);
    }

    public HistoricoStatusLicenca suspender(String justificativa, String atorSubject, String autorRotulo) {
        if (status != StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Somente licenças ATIVAS podem ser suspensas");
        }
        var anterior = this.status;
        this.status = StatusLicenca.SUSPENSA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(
            id, anterior, StatusLicenca.SUSPENSA, justificativa, atorSubject, autorRotulo);
    }

    public HistoricoStatusLicenca reativar(String justificativa, String autor) {
        if (status != StatusLicenca.SUSPENSA) {
            throw new IllegalStateException(
                "Licenca nao pode ser reativada pois nao esta SUSPENSA. Status atual: " + status);
        }
        var anterior = this.status;
        this.status = StatusLicenca.ATIVA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.ATIVA, justificativa, autor);
    }

    public HistoricoStatusLicenca reativar(String justificativa, String atorSubject, String autorRotulo) {
        if (status != StatusLicenca.SUSPENSA) {
            throw new IllegalStateException(
                "Licenca nao pode ser reativada pois nao esta SUSPENSA. Status atual: " + status);
        }
        var anterior = this.status;
        this.status = StatusLicenca.ATIVA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(
            id, anterior, StatusLicenca.ATIVA, justificativa, atorSubject, autorRotulo);
    }

    public HistoricoStatusLicenca encerrar(String justificativa, String autor) {
        if (status == StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Licenca deve ser suspensa antes de ser encerrada");
        }
        if (status == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException("Licenca ja esta encerrada");
        }
        var anterior = this.status;
        this.status = StatusLicenca.ENCERRADA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.ENCERRADA, justificativa, autor);
    }

    public HistoricoStatusLicenca encerrar(String justificativa, String atorSubject, String autorRotulo) {
        if (status == StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Licenca deve ser suspensa antes de ser encerrada");
        }
        if (status == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException("Licenca ja esta encerrada");
        }
        var anterior = this.status;
        this.status = StatusLicenca.ENCERRADA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(
            id, anterior, StatusLicenca.ENCERRADA, justificativa, atorSubject, autorRotulo);
    }

    public UUID getId() { return id; }
    public UUID getUsuarioMusicaId() { return usuarioMusicaId; }
    public UUID getRubricaId() { return rubricaId; }
    public LocalDate getDataInicio() { return dataInicio; }
    public LocalDate getDataFim() { return dataFim; }
    public StatusLicenca getStatus() { return status; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
    public UsuarioMusica getUsuarioMusica() { return usuarioMusica; }
    public Rubrica getRubrica() { return rubrica; }
}
