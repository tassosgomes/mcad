package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.ecad.distribuicao.application.services.ParsedRol;
import br.com.ecad.distribuicao.application.services.RolPayloadParser;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RolPayloadParserTest {

    private static final UUID OBRA_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");

    private final RolPayloadParser parser = new RolPayloadParser(new ObjectMapper());

    @Test
    void parse_WithDuplicatedCurrentRolShape_ShouldReturnUniqueObraAndFonogramaIds() {
        String payload = """
                {
                  "CaptacaoId": "00000000-0000-0000-0000-000000000301",
                  "Rubrica": "RADIO",
                  "Periodo": "2026-05",
                  "Execucoes": [
                    {
                      "ObraId": "%s",
                      "FonogramaId": "%s",
                      "Quantidade": 2,
                      "Peso": 1.5,
                      "ObraTitulo": "Obra A"
                    },
                    {
                      "ObraId": "%s",
                      "FonogramaId": "%s",
                      "Quantidade": 3,
                      "Peso": 2.0,
                      "ObraTitulo": "Obra A"
                    },
                    {
                      "ObraId": "%s",
                      "Quantidade": 4,
                      "ObraTitulo": "Obra B"
                    }
                  ]
                }
                """.formatted(OBRA_A_ID, FONOGRAMA_ID, OBRA_A_ID, FONOGRAMA_ID, OBRA_B_ID);

        ParsedRol parsedRol = parser.parse(payload);

        assertThat(parsedRol.execucoes()).hasSize(3);
        assertThat(parsedRol.obraIds()).containsExactlyInAnyOrder(OBRA_A_ID, OBRA_B_ID);
        assertThat(parsedRol.fonogramaIds()).containsExactly(FONOGRAMA_ID);
        assertThat(parsedRol.execucoes().getFirst().pesoTipoUtilizacao()).isEqualByComparingTo("1.5");
        assertThat(parsedRol.execucoes().getLast().pesoTipoUtilizacao()).isEqualByComparingTo(BigDecimal.ONE);
    }

    @Test
    void parse_WithDataWrappedPayload_ShouldReadExecucoesFromDataNode() {
        String payload = """
                {
                  "data": {
                    "execucoes": [
                      {
                        "obraId": "%s",
                        "quantidade": "1",
                        "pesoTipoUtilizacao": "2.5",
                        "tituloObra": "Obra A"
                      }
                    ]
                  }
                }
                """.formatted(OBRA_A_ID);

        ParsedRol parsedRol = parser.parse(payload);

        assertThat(parsedRol.execucoes()).hasSize(1);
        assertThat(parsedRol.execucoes().getFirst().obraTitulo()).isEqualTo("Obra A");
        assertThat(parsedRol.execucoes().getFirst().pesoTipoUtilizacao()).isEqualByComparingTo("2.5");
    }

    @Test
    void parse_WithMissingExecucoes_ShouldThrowPreRequisitosException() {
        assertThatThrownBy(() -> parser.parse("{\"rubrica\":\"RADIO\"}"))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("execuções");
    }
}
