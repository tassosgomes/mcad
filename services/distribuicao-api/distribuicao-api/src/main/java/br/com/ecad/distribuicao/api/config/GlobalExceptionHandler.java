package br.com.ecad.distribuicao.api.config;

import br.com.ecad.distribuicao.domain.exceptions.CadastroIntegrationException;
import br.com.ecad.distribuicao.domain.exceptions.ConflictException;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.exceptions.TransicaoInvalidaException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@SuppressWarnings("null")
public class GlobalExceptionHandler {

    @ExceptionHandler(TransicaoInvalidaException.class)
    ProblemDetail handleTransicaoInvalida(TransicaoInvalidaException exception, HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY,
                exception.getMessage());
        problemDetail.setTitle("Unprocessable Entity");
        problemDetail.setType(URI.create("https://www.rfc-editor.org/rfc/rfc9457"));
        if (request != null) {
            problemDetail.setInstance(URI.create(request.getRequestURI()));
        }
        return problemDetail;
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException exception, HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                exception.getMessage());
        problemDetail.setTitle("Conflict");
        problemDetail.setType(URI.create("https://www.rfc-editor.org/rfc/rfc9457"));
        if (request != null) {
            problemDetail.setInstance(URI.create(request.getRequestURI()));
        }
        return problemDetail;
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage());
        problemDetail.setTitle("Resource Not Found");
        problemDetail.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.4"));
        return problemDetail;
    }

    @ExceptionHandler(PreRequisitosException.class)
    ProblemDetail handlePreRequisitos(PreRequisitosException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY,
                exception.getMessage());
        problemDetail.setTitle("Calculation Preconditions Failed");
        problemDetail.setType(URI.create("https://www.rfc-editor.org/rfc/rfc9457"));
        return problemDetail;
    }

    @ExceptionHandler(CadastroIntegrationException.class)
    ProblemDetail handleCadastroIntegration(CadastroIntegrationException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                exception.getMessage());
        problemDetail.setTitle("Cadastro Integration Failure");
        problemDetail.setType(URI.create("https://www.rfc-editor.org/rfc/rfc9457"));
        return problemDetail;
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ProblemDetail handleMethodNotAllowed(HttpRequestMethodNotSupportedException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.METHOD_NOT_ALLOWED,
                "Rubricas são dados sincronizados da Arrecadação e não podem ser modificados localmente");
        problemDetail.setTitle("Method Not Allowed");
        problemDetail.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.5"));
        return problemDetail;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception exception) {
        if (exception instanceof org.springframework.security.access.AccessDeniedException accessDeniedException) {
            throw accessDeniedException;
        }
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected error while processing the request.");
        problemDetail.setTitle("Internal Server Error");
        problemDetail.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.6.1"));
        return problemDetail;
    }
}
