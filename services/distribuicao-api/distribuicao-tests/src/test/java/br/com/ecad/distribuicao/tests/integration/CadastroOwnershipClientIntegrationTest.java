package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.infra.cadastro.CadastroOwnershipProperties;
import br.com.ecad.distribuicao.infra.cadastro.HttpCadastroOwnershipClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(
        classes = {
            HttpCadastroOwnershipClient.class,
            CadastroOwnershipClientIntegrationTest.TestConfig.class
        },
        properties = {
            "app.integrations.cadastro.connect-timeout=100ms",
            "app.integrations.cadastro.read-timeout=2s",
            "app.integrations.cadastro.service-token=test-service-token"
        })
class CadastroOwnershipClientIntegrationTest {

    private static final String SNAPSHOT_PATH = "/api/v1/distribuicao/ownership-snapshot";
    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID AUTOR_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final UUID INTERPRETE_ID = UUID.fromString("00000000-0000-0000-0000-000000000302");

    private static HttpServer server;

    @Autowired
    private CadastroOwnershipClient cadastroOwnershipClient;

    @Autowired
    private CadastroOwnershipProperties properties;

    @BeforeAll
    static void startServer() {
        ensureServerStarted();
    }

    @AfterAll
    static void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        ensureServerStarted();
        registry.add("app.integrations.cadastro.base-url", () -> "http://localhost:" + server.getAddress().getPort());
    }

    @Test
    void context_WithConfiguredCadastroBaseUrl_ShouldCreateOwnershipClientBean() {
        assertThat(cadastroOwnershipClient).isInstanceOf(HttpCadastroOwnershipClient.class);
        assertThat(properties.getBaseUrl()).startsWith("http://localhost:");
    }

    @Test
    void buscarOwnership_WithHttpStub_ShouldMapSnapshotWithoutPrecisionLoss() {
        OwnershipSnapshot snapshot = cadastroOwnershipClient.buscarOwnership(
                Set.of(OBRA_ID),
                Set.of(FONOGRAMA_ID),
                null);

        assertThat(snapshot.obras()).hasSize(1);
        assertThat(snapshot.obras().getFirst().titularidades().getFirst().percentual())
                .isEqualByComparingTo(new BigDecimal("12.345678"));
        assertThat(snapshot.fonogramas()).hasSize(1);
        assertThat(snapshot.fonogramas().getFirst().participacoes().getFirst().subcategoriaConexa())
                .isEqualTo(SubcategoriaConexa.INTERPRETE);
        assertThat(snapshot.fonogramas().getFirst().participacoes().getFirst().percentual())
                .isEqualByComparingTo(new BigDecimal("87.654321"));
    }

    private static void handleSnapshot(HttpExchange exchange) throws IOException {
        byte[] bytes = snapshotBody().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().put("Content-Type", List.of("application/json"));
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static void ensureServerStarted() {
        if (server != null) {
            return;
        }
        try {
            server = HttpServer.create(new InetSocketAddress(0), 0);
            server.createContext(SNAPSHOT_PATH, CadastroOwnershipClientIntegrationTest::handleSnapshot);
            server.start();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to start Cadastro HTTP stub", exception);
        }
    }

    private static String snapshotBody() {
        return """
                {
                  "obras": [
                    {
                      "obraId": "%s",
                      "titulo": "Obra Precisao",
                      "status": "LIBERADA",
                      "titularidades": [
                        {
                          "titularId": "%s",
                          "nome": "Autor Precisao",
                          "associacaoSigla": "UBC",
                          "categoria": "AUTOR",
                          "percentual": 12.345678
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
                          "nome": "Interprete Precisao",
                          "associacaoSigla": "UBC",
                          "categoria": "INTERPRETE",
                          "percentual": 87.654321
                        }
                      ]
                    }
                  ]
                }
                """.formatted(OBRA_ID, AUTOR_ID, FONOGRAMA_ID, OBRA_ID, INTERPRETE_ID);
    }

    @EnableConfigurationProperties(CadastroOwnershipProperties.class)
    static class TestConfig {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }

        @Bean
        MeterRegistry meterRegistry() {
            return new SimpleMeterRegistry();
        }
    }
}
