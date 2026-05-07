package br.com.ecad.distribuicao.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "snapshots_rol", schema = "distribuicao")
public class SnapshotRol {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false)
    private String rubricaSigla;

    @Column(nullable = false)
    private String periodo;

    @Column(name = "captacao_id")
    private UUID captacaoId;

    @Column(name = "total_execucoes")
    private int totalExecucoes;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false)
    private boolean cancelado;

    @Column(name = "recebido_em", nullable = false)
    private Instant recebidoEm;

    protected SnapshotRol() {}

    public SnapshotRol(String rubricaSigla, String periodo, UUID captacaoId, int totalExecucoes, String payload, boolean cancelado, Instant recebidoEm) {
        this.rubricaSigla = rubricaSigla;
        this.periodo = periodo;
        this.captacaoId = captacaoId;
        this.totalExecucoes = totalExecucoes;
        this.payload = payload;
        this.cancelado = cancelado;
        this.recebidoEm = recebidoEm;
    }

    public UUID getId() { return id; }
    public String getRubricaSigla() { return rubricaSigla; }
    public String getPeriodo() { return periodo; }
    public UUID getCaptacaoId() { return captacaoId; }
    public int getTotalExecucoes() { return totalExecucoes; }
    public String getPayload() { return payload; }
    public boolean isCancelado() { return cancelado; }
    public Instant getRecebidoEm() { return recebidoEm; }

    public void setCancelado(boolean cancelado) {
        this.cancelado = cancelado;
    }
}
