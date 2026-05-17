package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.exceptions.CadastroIntegrationException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.infra.cadastro.CadastroOwnershipProperties;
import br.com.ecad.distribuicao.infra.cadastro.HttpCadastroOwnershipClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class HttpCadastroOwnershipClientTest {

    private static final String SNAPSHOT_PATH = "/api/v1/distribuicao/ownership-snapshot";
    private static final UUID OBRA_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;
    private CadastroOwnershipProperties properties;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.start();

        properties = new CadastroOwnershipProperties();
        properties.setBaseUrl("http://localhost:" + server.getAddress().getPort());
        properties.setConnectTimeout(Duration.ofMillis(100));
        properties.setReadTimeout(Duration.ofSeconds(2));
        meterRegistry = new SimpleMeterRegistry();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void buscarOwnership_WithIds_ShouldSendUniqueIdsInOneRequest() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        AtomicReference<String> body = new AtomicReference<>();
        server.createContext(SNAPSHOT_PATH, exchange -> {
            hits.incrementAndGet();
            body.set(readBody(exchange));
            respond(exchange, 200, validSnapshotBody());
        });
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        client.buscarOwnership(Set.of(OBRA_A_ID, OBRA_B_ID), Set.of(FONOGRAMA_ID), null);

        JsonNode request = objectMapper.readTree(body.get());
        assertThat(hits).hasValue(1);
        assertThat(request.get("obraIds"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder(OBRA_A_ID.toString(), OBRA_B_ID.toString());
        assertThat(request.get("fonogramaIds"))
                .extracting(JsonNode::asText)
                .containsExactly(FONOGRAMA_ID.toString());
    }

    @Test
    void buscarOwnership_WithAnalystBearerToken_ShouldForwardAuthorizationHeader() {
        AtomicReference<String> authorization = new AtomicReference<>();
        server.createContext(SNAPSHOT_PATH, exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            respond(exchange, 200, validSnapshotBody());
        });
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), "Bearer analyst-token");

        assertThat(authorization).hasValue("Bearer analyst-token");
    }

    @Test
    void buscarOwnership_WithServiceTokenAndNoAnalystToken_ShouldUseConfiguredServiceToken() {
        AtomicReference<String> authorization = new AtomicReference<>();
        properties.setServiceToken("service-token");
        server.createContext(SNAPSHOT_PATH, exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            respond(exchange, 200, validSnapshotBody());
        });
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), null);

        assertThat(authorization).hasValue("Bearer service-token");
    }

    @Test
    void buscarOwnership_WithCadastro422_ShouldThrowPreRequisitosException() {
        server.createContext(SNAPSHOT_PATH, exchange ->
                respond(exchange, 422, "{\"title\":\"Unprocessable Entity\",\"detail\":\"missing obra\"}"));
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        assertThatThrownBy(() -> client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), null))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Cadastro rejeitou ownership snapshot");
    }

    @Test
    void buscarOwnership_WithCadastro500_ShouldThrowIntegrationException() {
        server.createContext(SNAPSHOT_PATH, exchange -> respond(exchange, 500, "internal error"));
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        assertThatThrownBy(() -> client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), null))
                .isInstanceOf(CadastroIntegrationException.class)
                .hasMessageContaining("Cadastro indisponível");
    }

    @Test
    void buscarOwnership_WithTimeout_ShouldThrowIntegrationException() {
        properties.setReadTimeout(Duration.ofMillis(50));
        server.createContext(SNAPSHOT_PATH, exchange -> {
            try {
                Thread.sleep(300);
                respond(exchange, 200, validSnapshotBody());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        assertThatThrownBy(() -> client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), null))
                .isInstanceOf(CadastroIntegrationException.class)
                .hasMessageContaining("Timeout");
        assertThat(meterRegistry.get("distribuicao.cadastro_acl.failures")
                        .tag("type", "integration-failure")
                        .counter()
                        .count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.get("distribuicao.cadastro_acl.duration")
                        .tag("outcome", "failure")
                        .timer()
                        .count())
                .isOne();
    }

    @Test
    void buscarOwnership_WithValidSnapshot_ShouldMapDomainRecords() {
        server.createContext(SNAPSHOT_PATH, exchange -> respond(exchange, 200, validSnapshotBody()));
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        OwnershipSnapshot snapshot = client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(FONOGRAMA_ID), null);

        assertThat(snapshot.obras()).hasSize(1);
        assertThat(snapshot.obras().getFirst().obraId()).isEqualTo(OBRA_A_ID);
        assertThat(snapshot.obras().getFirst().status()).isEqualTo("LIBERADA");
        assertThat(snapshot.obras().getFirst().titularidades().getFirst().associacaoSigla()).isEqualTo("UBC");
        assertThat(snapshot.obras().getFirst().titularidades().getFirst().categoria()).isEqualTo(CategoriaCredito.AUTORAL);
        assertThat(snapshot.obras().getFirst().titularidades().getFirst().percentual())
                .isEqualByComparingTo(new BigDecimal("33.333333"));
        assertThat(snapshot.fonogramas()).hasSize(1);
        assertThat(snapshot.fonogramas().getFirst().status()).isEqualTo("LIBERADO");
        assertThat(snapshot.fonogramas().getFirst().participacoes().getFirst().associacaoSigla()).isEqualTo("UBC");
        assertThat(snapshot.fonogramas().getFirst().participacoes().getFirst().percentual())
                .isEqualByComparingTo(new BigDecimal("66.666667"));
    }

    @Test
    void buscarOwnership_WithMissingObraStatus_ShouldThrowPreRequisitosException() {
        server.createContext(SNAPSHOT_PATH, exchange -> respond(exchange, 200, """
                {
                  "obras": [
                    {
                      "obraId": "%s",
                      "titulo": "Obra A",
                      "titularidades": [
                        {
                          "titularId": "%s",
                          "nome": "Autor",
                          "associacaoSigla": "UBC",
                          "percentual": 100.0
                        }
                      ]
                    }
                  ],
                  "fonogramas": []
                }
                """.formatted(OBRA_A_ID, TITULAR_ID)));
        HttpCadastroOwnershipClient client = new HttpCadastroOwnershipClient(properties, objectMapper, meterRegistry);

        assertThatThrownBy(() -> client.buscarOwnership(Set.of(OBRA_A_ID), Set.of(), null))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Obra sem status");
    }

    private String validSnapshotBody() {
        return """
                {
                  "obras": [
                    {
                      "obraId": "%s",
                      "titulo": "Obra A",
                      "status": "LIBERADA",
                      "titularidades": [
                        {
                          "titularId": "%s",
                          "nome": "Autor",
                          "associacaoSigla": "UBC",
                          "categoria": "AUTOR",
                          "percentual": 33.333333
                        }
                      ]
                    }
                  ],
                  "fonogramas": [
                    {
                      "fonogramaId": "%s",
                      "obraId": "%s",
                      "status": "LIBERADO",
                      "participacoes": [
                        {
                          "titularId": "%s",
                          "nome": "Produtor",
                          "associacaoSigla": "UBC",
                          "categoria": "PRODUTOR_FONOGRAFICO",
                          "percentual": 66.666667
                        }
                      ]
                    }
                  ]
                }
                """.formatted(OBRA_A_ID, TITULAR_ID, FONOGRAMA_ID, OBRA_A_ID, TITULAR_ID);
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private void respond(HttpExchange exchange, int statusCode, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().put("Content-Type", List.of("application/json"));
        exchange.sendResponseHeaders(statusCode, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
