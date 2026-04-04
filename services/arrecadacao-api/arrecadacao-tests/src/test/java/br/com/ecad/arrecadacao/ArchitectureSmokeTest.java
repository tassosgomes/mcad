package br.com.ecad.arrecadacao;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import static org.assertj.core.api.Assertions.assertThat;

class ArchitectureSmokeTest {

    @Test
    void arrecadacaoApplicationShouldBeAnnotatedAsSpringBootApplication() {
        assertThat(ArrecadacaoApplication.class.isAnnotationPresent(SpringBootApplication.class)).isTrue();
    }
}
