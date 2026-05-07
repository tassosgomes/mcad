package br.com.ecad.distribuicao.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

class GlobalExceptionHandlerTest {

    @Test
    void handlePreRequisitos_WithCalculationPrecondition_ShouldReturn422ProblemDetail() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ProblemDetail problemDetail = handler.handlePreRequisitos(
                new PreRequisitosException("Processo deve estar em CRIADO"));

        assertThat(problemDetail.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY.value());
        assertThat(problemDetail.getTitle()).isEqualTo("Calculation Preconditions Failed");
        assertThat(problemDetail.getDetail()).isEqualTo("Processo deve estar em CRIADO");
    }
}
