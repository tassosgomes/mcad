package br.com.ecad.arrecadacao.domain.valueobjects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Cnpj {
    @Column(name = "cnpj", nullable = false, length = 14)
    private String valor;

    protected Cnpj() {}

    public static Cnpj criar(String value) {
        if (value == null) throw new IllegalArgumentException("CNPJ invalido");
        String clean = value.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (clean.length() != 14) throw new IllegalArgumentException("CNPJ invalido");
        if (!Character.isDigit(clean.charAt(12)) || !Character.isDigit(clean.charAt(13))) {
            throw new IllegalArgumentException("CNPJ invalido");
        }

        int sum1 = 0;
        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        for (int i = 0; i < 12; i++) {
            char c = clean.charAt(i);
            int val = Character.isDigit(c) ? c - '0' : c - 48; // 'A'-48 = 65-48 = 17
            sum1 += val * weights1[i];
        }
        int rest1 = sum1 % 11;
        int dv1 = rest1 < 2 ? 0 : 11 - rest1;
        if (clean.charAt(12) - '0' != dv1) throw new IllegalArgumentException("CNPJ invalido");

        int sum2 = 0;
        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        for (int i = 0; i < 13; i++) {
            char c = clean.charAt(i);
            int val = Character.isDigit(c) ? c - '0' : c - 48;
            sum2 += val * weights2[i];
        }
        int rest2 = sum2 % 11;
        int dv2 = rest2 < 2 ? 0 : 11 - rest2;
        if (clean.charAt(13) - '0' != dv2) throw new IllegalArgumentException("CNPJ invalido");

        Cnpj cnpj = new Cnpj();
        cnpj.valor = clean;
        return cnpj;
    }

    public String getValor() {
        return valor;
    }

    public String getFormatado() {
        if (valor == null || valor.length() != 14) return valor;
        return valor.substring(0, 2) + "." +
               valor.substring(2, 5) + "." +
               valor.substring(5, 8) + "/" +
               valor.substring(8, 12) + "-" +
               valor.substring(12, 14);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Cnpj cnpj = (Cnpj) o;
        return Objects.equals(valor, cnpj.valor);
    }

    @Override
    public int hashCode() {
        return Objects.hash(valor);
    }
}
