package br.com.ecad.distribuicao.api.config;

import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@SuppressWarnings("null")
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage());
        problemDetail.setTitle("Resource Not Found");
        problemDetail.setType(URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.4"));
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
