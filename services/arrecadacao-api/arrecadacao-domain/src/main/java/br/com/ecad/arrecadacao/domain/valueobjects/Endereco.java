package br.com.ecad.arrecadacao.domain.valueobjects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Endereco {
    @Column(nullable = false, length = 8)
    private String cep;

    @Column(nullable = false, length = 200)
    private String logradouro;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(length = 100)
    private String complemento;

    @Column(nullable = false, length = 100)
    private String bairro;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String uf;

    protected Endereco() {}

    public static Endereco criar(String cep, String logradouro, String numero, String complemento, String bairro, String cidade, String uf) {
        Endereco e = new Endereco();
        e.cep = Objects.requireNonNull(cep, "cep must not be null");
        e.logradouro = Objects.requireNonNull(logradouro, "logradouro must not be null");
        e.numero = Objects.requireNonNull(numero, "numero must not be null");
        e.complemento = complemento;
        e.bairro = Objects.requireNonNull(bairro, "bairro must not be null");
        e.cidade = Objects.requireNonNull(cidade, "cidade must not be null");
        e.uf = Objects.requireNonNull(uf, "uf must not be null");
        return e;
    }

    public String getCep() { return cep; }
    public String getLogradouro() { return logradouro; }
    public String getNumero() { return numero; }
    public String getComplemento() { return complemento; }
    public String getBairro() { return bairro; }
    public String getCidade() { return cidade; }
    public String getUf() { return uf; }
}
