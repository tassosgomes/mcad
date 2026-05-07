package br.com.ecad.distribuicao.domain.calculo;

import br.com.ecad.distribuicao.domain.entities.Credito;
import java.util.List;
import java.util.Objects;

public record ResultadoCalculo(
        List<Credito> creditos,
        ResumoCalculo resumo) {

    public ResultadoCalculo {
        creditos = List.copyOf(Objects.requireNonNull(creditos, "creditos must not be null"));
        Objects.requireNonNull(resumo, "resumo must not be null");
    }
}
