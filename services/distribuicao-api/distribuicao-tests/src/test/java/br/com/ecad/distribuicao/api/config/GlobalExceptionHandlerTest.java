package br.com.ecad.distribuicao.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.org.ecad.authz.sdk.error.AuthzExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

class GlobalExceptionHandlerTest {

    @Test
    @SuppressWarnings("unchecked")
    void handlePreRequisitos_WithCalculationPrecondition_ShouldReturn422ProblemDetail() {
        GlobalExceptionHandler handler =
                new GlobalExceptionHandler((ObjectProvider<AuthzExceptionHandler>) mock(ObjectProvider.class));

        ProblemDetail problemDetail = handler.handlePreRequisitos(
                new PreRequisitosException("Processo deve estar em CRIADO"));

        assertThat(problemDetail.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY.value());
        assertThat(problemDetail.getTitle()).isEqualTo("Calculation Preconditions Failed");
        assertThat(problemDetail.getDetail()).isEqualTo("Processo deve estar em CRIADO");
    }
}
