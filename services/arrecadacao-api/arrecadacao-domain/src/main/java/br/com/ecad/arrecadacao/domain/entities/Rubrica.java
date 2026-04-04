package br.com.ecad.arrecadacao.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "rubricas",
        schema = "arrecadacao",
        uniqueConstraints = @UniqueConstraint(name = "uq_rubricas_sigla", columnNames = "sigla"))
public class Rubrica {
    @Id
    private UUID id;

    @Column(nullable = false, length = 20)
    private String sigla;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "exige_classificacao", nullable = false)
    private boolean exigeClassificacao;

    protected Rubrica() {
    }

    public Rubrica(UUID id, String sigla, String nome, boolean exigeClassificacao) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.sigla = Objects.requireNonNull(sigla, "sigla must not be null");
        this.nome = Objects.requireNonNull(nome, "nome must not be null");
        this.exigeClassificacao = exigeClassificacao;
    }

    public UUID getId() {
        return id;
    }

    public String getSigla() {
        return sigla;
    }

    public String getNome() {
        return nome;
    }

    public boolean isExigeClassificacao() {
        return exigeClassificacao;
    }
}
