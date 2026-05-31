package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "usuarios_musica", schema = "arrecadacao")
public class UsuarioMusica {
    @Id
    private UUID id;

    @Column(name = "razao_social", nullable = false, length = 200)
    private String razaoSocial;

    @Column(name = "nome_fantasia", length = 200)
    private String nomeFantasia;

    @Embedded
    private Cnpj cnpj;

    @Embedded
    private Endereco endereco;

    @Embedded
    private Contato contato;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusUsuarioMusica status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected UsuarioMusica() {}

    public static UsuarioMusica criar(String razaoSocial, String nomeFantasia, Cnpj cnpj, Endereco endereco, Contato contato) {
        if (razaoSocial == null || razaoSocial.length() < 3) {
            throw new IllegalArgumentException("razaoSocial must have at least 3 characters");
        }
        UsuarioMusica u = new UsuarioMusica();
        u.id = UUID.randomUUID();
        u.razaoSocial = razaoSocial;
        u.nomeFantasia = nomeFantasia;
        u.cnpj = Objects.requireNonNull(cnpj, "cnpj must not be null");
        u.endereco = Objects.requireNonNull(endereco, "endereco must not be null");
        u.contato = Objects.requireNonNull(contato, "contato must not be null");
        u.status = StatusUsuarioMusica.ATIVO;
        u.criadoEm = Instant.now();
        u.atualizadoEm = u.criadoEm;
        return u;
    }

    public void atualizar(String razaoSocial, String nomeFantasia, Endereco endereco, Contato contato) {
        if (razaoSocial == null || razaoSocial.length() < 3) {
            throw new IllegalArgumentException("razaoSocial must have at least 3 characters");
        }
        this.razaoSocial = razaoSocial;
        this.nomeFantasia = nomeFantasia;
        this.endereco = Objects.requireNonNull(endereco, "endereco must not be null");
        this.contato = Objects.requireNonNull(contato, "contato must not be null");
        this.atualizadoEm = Instant.now();
    }

    public HistoricoStatusUsuario inativar(String justificativa, String autor) {
        if (this.status == StatusUsuarioMusica.INATIVO) {
            throw new IllegalStateException("ja INATIVO");
        }
        StatusUsuarioMusica statusAnterior = this.status;
        this.status = StatusUsuarioMusica.INATIVO;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusUsuario.criar(this.id, statusAnterior, this.status, justificativa, autor);
    }

    public HistoricoStatusUsuario inativar(String justificativa, String atorSubject, String autorRotulo) {
        if (this.status == StatusUsuarioMusica.INATIVO) {
            throw new IllegalStateException("ja INATIVO");
        }
        StatusUsuarioMusica statusAnterior = this.status;
        this.status = StatusUsuarioMusica.INATIVO;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusUsuario.criar(this.id, statusAnterior, this.status, justificativa, atorSubject, autorRotulo);
    }

    public HistoricoStatusUsuario ativar(String justificativa, String autor) {
        if (this.status == StatusUsuarioMusica.ATIVO) {
            throw new IllegalStateException("ja ATIVO");
        }
        StatusUsuarioMusica statusAnterior = this.status;
        this.status = StatusUsuarioMusica.ATIVO;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusUsuario.criar(this.id, statusAnterior, this.status, justificativa, autor);
    }

    public HistoricoStatusUsuario ativar(String justificativa, String atorSubject, String autorRotulo) {
        if (this.status == StatusUsuarioMusica.ATIVO) {
            throw new IllegalStateException("ja ATIVO");
        }
        StatusUsuarioMusica statusAnterior = this.status;
        this.status = StatusUsuarioMusica.ATIVO;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusUsuario.criar(this.id, statusAnterior, this.status, justificativa, atorSubject, autorRotulo);
    }

    public UUID getId() { return id; }
    public String getRazaoSocial() { return razaoSocial; }
    public String getNomeFantasia() { return nomeFantasia; }
    public Cnpj getCnpj() { return cnpj; }
    public Endereco getEndereco() { return endereco; }
    public Contato getContato() { return contato; }
    public StatusUsuarioMusica getStatus() { return status; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
