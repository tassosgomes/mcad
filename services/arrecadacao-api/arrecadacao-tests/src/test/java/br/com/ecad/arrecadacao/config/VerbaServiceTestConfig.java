package br.com.ecad.arrecadacao.config;

import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import java.util.UUID;

/**
 * Fornece implementação stub configurável de VerbaService para testes de integração.
 * O stub pode ser configurado para lançar VerbaEmDistribuicaoException via
 * VerbaServiceTestConfig.forceVerbaLock() e resetado via VerbaServiceTestConfig.reset().
 */
@TestConfiguration
public class VerbaServiceTestConfig {

    /**
     * Stub de VerbaService configurável via variáveis estáticas de thread-safe.
     * Permite simular lock de verba sem usar @MockBean (que invalida o Spring context cache).
     */
    public static class ConfigurableVerbaServiceStub implements VerbaService {
        private static volatile boolean throwLockException = false;

        public static void forceVerbaLock() {
            throwLockException = true;
        }

        public static void reset() {
            throwLockException = false;
        }

        @Override
        public void validarLockParaEstorno(UUID licencaId, String periodo) {
            if (throwLockException) {
                throw new VerbaEmDistribuicaoException(
                    "Nao e possivel estornar pagamento com verba em distribuicao");
            }
        }

        @Override
        public void recalcularVerba(String rubricaSigla, String periodo) {
            // no-op: recálculo ignorado nos testes
        }
    }

    @Bean
    VerbaService verbaService() {
        return new ConfigurableVerbaServiceStub();
    }
}
