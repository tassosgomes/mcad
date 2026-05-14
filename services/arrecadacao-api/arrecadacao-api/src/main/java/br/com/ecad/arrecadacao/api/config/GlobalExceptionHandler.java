package br.com.ecad.arrecadacao.api.config;

import br.org.ecad.authz.sdk.error.AuthzServiceUnavailableException;
import br.org.ecad.authz.sdk.error.InvalidTokenException;
import br.org.ecad.authz.sdk.error.MissingPermissionException;
import br.org.ecad.authz.sdk.error.SessionRevokedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@SuppressWarnings("null")
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpectedException(Exception exception) {
        // Let Spring Security handle its own exceptions (AccessDeniedException, etc.)
        if (exception instanceof org.springframework.security.access.AccessDeniedException accessDenied) {
            throw accessDenied;
        }
        // Repassa exceções do `authz-spring-boot-starter` para o AuthzExceptionHandler do SDK.
        // Necessário porque ambos advices podem reivindicar Exception.class via inheritance e
        // a ordem entre eles é indeterminada — repassar explicitamente garante 401/403/503.
        if (exception instanceof InvalidTokenException
                || exception instanceof MissingPermissionException
                || exception instanceof SessionRevokedException
                || exception instanceof AuthzServiceUnavailableException) {
            throw (RuntimeException) exception;
        }
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Unexpected error while processing the request."
        );
        problemDetail.setTitle("Internal Server Error");
        return problemDetail;
    }

    @ExceptionHandler(InvalidTokenException.class)
    ResponseEntity<ProblemDetail> handleAuthzInvalidToken(InvalidTokenException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        pd.setTitle("Unauthorized");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(pd);
    }

    @ExceptionHandler(MissingPermissionException.class)
    ResponseEntity<ProblemDetail> handleAuthzMissingPermission(MissingPermissionException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        pd.setTitle("Forbidden");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(pd);
    }

    @ExceptionHandler(SessionRevokedException.class)
    ResponseEntity<ProblemDetail> handleAuthzSessionRevoked(SessionRevokedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        pd.setTitle("Session Revoked");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(pd);
    }

    @ExceptionHandler(AuthzServiceUnavailableException.class)
    ResponseEntity<ProblemDetail> handleAuthzServiceUnavailable(AuthzServiceUnavailableException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        pd.setTitle("AuthZ Service Unavailable");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(pd);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ProblemDetail handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Acesso negado: " + ex.getMessage());
        pd.setTitle("Forbidden");
        return pd;
    }

    @ExceptionHandler(br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException.class)
    ProblemDetail handleNotFound(br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Resource Not Found");
        pd.setType(java.net.URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.4"));
        return pd;
    }

    @ExceptionHandler(br.com.ecad.arrecadacao.domain.exceptions.CnpjDuplicadoException.class)
    ProblemDetail handleConflict(br.com.ecad.arrecadacao.domain.exceptions.CnpjDuplicadoException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Conflict");
        pd.setType(java.net.URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.8"));
        return pd;
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    ProblemDetail handleUnprocessable(RuntimeException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        pd.setTitle("Unprocessable Entity");
        return pd;
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Um ou mais campos sao invalidos");
        pd.setTitle("Validation Error");
        java.util.List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .toList();
        pd.setProperty("errors", errors);
        return pd;
    }

    @ExceptionHandler(br.com.ecad.arrecadacao.domain.exceptions.PagamentoDuplicadoException.class)
    ProblemDetail handlePagamentoDuplicado(br.com.ecad.arrecadacao.domain.exceptions.PagamentoDuplicadoException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Duplicate Payment");
        pd.setType(java.net.URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.8"));
        return pd;
    }

    @ExceptionHandler(br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException.class)
    ProblemDetail handleUdaVigenteNaoEncontrada(br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        pd.setTitle("UDA Value Not Found");
        return pd;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        // Safety net: partial unique constraint violation via race condition
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT, "Conflito de dados: ja existe um registro para este periodo");
        pd.setTitle("Conflict");
        pd.setType(java.net.URI.create("https://tools.ietf.org/html/rfc7231#section-6.5.8"));
        return pd;
    }

    @ExceptionHandler(br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException.class)
    ResponseEntity<ProblemDetail> handleVerbaEmDistribuicao(
            br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        pd.setTitle("Verba In Distribution");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(pd);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    ProblemDetail handleConstraintViolation(jakarta.validation.ConstraintViolationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Um ou mais parametros sao invalidos");
        pd.setTitle("Validation Error");
        java.util.List<String> errors = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();
        pd.setProperty("errors", errors);
        return pd;
    }
}
