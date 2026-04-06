package br.com.ecad.arrecadacao.domain.valueobjects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Contato {
    @Column(name = "nome_responsavel", nullable = false, length = 200)
    private String nomeResponsavel;

    @Column(length = 20)
    private String telefone;

    @Column(length = 200)
    private String email;

    protected Contato() {}

    public static Contato criar(String nomeResponsavel, String telefone, String email) {
        Contato c = new Contato();
        c.nomeResponsavel = Objects.requireNonNull(nomeResponsavel, "nomeResponsavel must not be null");
        c.telefone = telefone;
        c.email = email;
        return c;
    }

    public String getNomeResponsavel() { return nomeResponsavel; }
    public String getTelefone() { return telefone; }
    public String getEmail() { return email; }
}
