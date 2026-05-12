package br.com.ecad.arrecadacao.domain.enums;

/**
 * Ciclo de vida da verba (RF-12).
 * Transições são irreversíveis: ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA.
 * Tentativa de retroceder lança IllegalStateException.
 */
public enum StatusVerba {
    ABERTA,
    EM_DISTRIBUICAO,
    DISTRIBUIDA
}
