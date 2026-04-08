package br.com.ecad.arrecadacao.infra.services;

import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Implementação no-op de VerbaService.
 * Será substituída pela implementação real quando o módulo de Verba (F05) for desenvolvido.
 */
@Component
public class VerbaServiceNoOp implements VerbaService {

    private static final Logger log = LoggerFactory.getLogger(VerbaServiceNoOp.class);

    @Override
    public void validarLockParaEstorno(UUID licencaId, String periodo) {
        log.debug("VerbaService.validarLockParaEstorno chamado (no-op) — licencaId={}, periodo={}", licencaId, periodo);
    }

    @Override
    public void recalcularVerba(String rubricaSigla, String periodo) {
        log.debug("VerbaService.recalcularVerba chamado (no-op) — rubrica={}, periodo={}", rubricaSigla, periodo);
    }
}
