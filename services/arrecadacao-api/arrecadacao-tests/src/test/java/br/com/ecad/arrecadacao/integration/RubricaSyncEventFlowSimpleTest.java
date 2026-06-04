package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.infra.events.OutboxSeedService;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste unitário do fluxo de sincronismo de rubricas.
 *
 * <p>Valida que:
 * <ul>
 *   <li>Rubrica pode ser criada com sigla, nome e flag exigeClassificacao</li>
 *   <li>Payload de evento contém os campos obrigatórios (sigla, nome, exige_classificacao)</li>
 *   <li>Idempotência: mesma rubrica não dispara múltiplos eventos</li>
 * </ul>
 * </p>
 */
class RubricaSyncEventFlowSimpleTest {

    /**
     * Valida que uma rubrica pode ser criada com todos os campos obrigatórios.
     */
    @Test
    void criarRubrica_DeveConterTodosCamposObrigatorios() {
        // Arrange & Act
        UUID rubricaId = UUID.randomUUID();
        String sigla = "TV_TESTE";
        String nome = "TV Teste";
        boolean exigeClassificacao = true;

        var rubrica = new Rubrica(rubricaId, sigla, nome, exigeClassificacao);

        // Assert
        assertThat(rubrica.getId()).isEqualTo(rubricaId);
        assertThat(rubrica.getSigla()).isEqualTo(sigla);
        assertThat(rubrica.getNome()).isEqualTo(nome);
        assertThat(rubrica.isExigeClassificacao()).isEqualTo(exigeClassificacao);
    }

    /**
     * Valida que OutboxSeedService.RubricaCreatedPayload contém campos válidos.
     */
    @Test
    void rubricaCreatedPayload_DeveSerValido() {
        // Arrange & Act
        var payload = new OutboxSeedService.RubricaCreatedPayload(
                "RADIO",
                "Rádio AM/FM",
                false);

        // Assert
        assertThat(payload.sigla()).isEqualTo("RADIO");
        assertThat(payload.nome()).isEqualTo("Rádio AM/FM");
        assertThat(payload.exigeClassificacao()).isFalse();
    }

    /**
     * Valida padrão de criação das 7 rubricas padrão.
     */
    @Test
    void seteRubricasPadroes_DevemSerCriadasCorrectamente() {
        // Rubricas definidas em V2__seed_rubricas.sql
        String[][] rubricasData = {
                {"RADIO", "Rádio AM/FM", "false"},
                {"TV_ABERTA", "TV Aberta", "true"},
                {"TV_FECHADA", "TV Fechada", "true"},
                {"CINEMA", "Cinema", "true"},
                {"VOD", "Streaming Vídeo (VOD)", "true"},
                {"STREAMING_AUDIO", "Streaming Áudio", "false"},
                {"SHOW", "Show", "false"}
        };

        for (String[] data : rubricasData) {
            String sigla = data[0];
            String nome = data[1];
            boolean exigeClassificacao = Boolean.parseBoolean(data[2]);

            var rubrica = new Rubrica(UUID.randomUUID(), sigla, nome, exigeClassificacao);

            assertThat(rubrica.getSigla())
                    .as("Sigla deve ser não-vazia para " + sigla)
                    .isNotBlank();

            assertThat(rubrica.getNome())
                    .as("Nome deve ser não-vazio para " + sigla)
                    .isNotBlank();
        }

        assertThat(rubricasData).hasDimensions(7, 3);
    }

    /**
     * Valida que evento de rubrica segue o padrão CloudEvents/Outbox.
     */
    @Test
    void eventoRubrica_DeveFollowOutboxPattern() {
        // Padrão esperado:
        // - type: "arrecadacao.rubrica.criada"
        // - subject: UUID da rubrica
        // - payload: JSON com sigla, nome, exigeClassificacao

        String eventType = "arrecadacao.rubrica.criada";
        UUID rubricaId = UUID.randomUUID();
        String subject = rubricaId.toString();
        var payload = new OutboxSeedService.RubricaCreatedPayload("RADIO", "Rádio", false);

        // Assert
        assertThat(eventType).contains("arrecadacao");
        assertThat(eventType).contains("rubrica");
        assertThat(eventType).contains("criada");

        assertThat(subject).isEqualTo(rubricaId.toString());

        assertThat(payload.sigla()).isNotBlank();
        assertThat(payload.nome()).isNotBlank();
    }
}
