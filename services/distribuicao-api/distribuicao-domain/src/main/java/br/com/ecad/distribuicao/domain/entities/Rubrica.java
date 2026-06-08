package br.com.ecad.distribuicao.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "rubricas",
        schema = "distribuicao",
        uniqueConstraints = @UniqueConstraint(name = "uq_distribuicao_rubricas_sigla", columnNames = "sigla"))
public class Rubrica {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 20)
    private String sigla;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "exige_classificacao", nullable = false)
    private boolean exigeClassificacao;

    @Column(nullable = false)
    private boolean ativo;

    @Column(name = "sincronizado_em", nullable = false)
    private Instant sincronizadoEm;

    protected Rubrica() {
    }

    public static Rubrica criar(String sigla, String nome, boolean exigeClassificacao, boolean ativo) {
        Rubrica rubrica = new Rubrica();
        rubrica.sigla = normalizarSigla(sigla);
        rubrica.nome = Objects.requireNonNull(nome, "nome must not be null").trim();
        rubrica.exigeClassificacao = exigeClassificacao;
        rubrica.ativo = ativo;
        rubrica.sincronizadoEm = Instant.now();
        return rubrica;
    }

    public void atualizar(String nome, boolean exigeClassificacao, boolean ativo) {
        this.nome = Objects.requireNonNull(nome, "nome must not be null").trim();
        this.exigeClassificacao = exigeClassificacao;
        this.ativo = ativo;
        this.sincronizadoEm = Instant.now();
    }

    private static String normalizarSigla(String sigla) {
        String valor = Objects.requireNonNull(sigla, "sigla must not be null").trim();
        if (valor.isBlank()) {
            throw new IllegalArgumentException("sigla must not be blank");
        }
        return valor;
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

    public boolean isAtivo() {
        return ativo;
    }

    public Instant getSincronizadoEm() {
        return sincronizadoEm;
    }
}
