package br.com.ecad.distribuicao.infra.cadastro;

import br.com.ecad.distribuicao.domain.calculo.FonogramaOwnership;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.exceptions.CadastroIntegrationException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class HttpCadastroOwnershipClient implements CadastroOwnershipClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(HttpCadastroOwnershipClient.class);
    private static final String OWNERSHIP_SNAPSHOT_PATH = "/api/v1/distribuicao/ownership-snapshot";
    private static final String CADASTRO_ACL_DURATION_METRIC = "distribuicao.cadastro_acl.duration";
    private static final String CADASTRO_ACL_FAILURES_METRIC = "distribuicao.cadastro_acl.failures";

    private final CadastroOwnershipProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final MeterRegistry meterRegistry;

    @Autowired
    public HttpCadastroOwnershipClient(
            CadastroOwnershipProperties properties,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry) {
        this(
                properties,
                objectMapper,
                HttpClient.newBuilder()
                        .connectTimeout(properties.getConnectTimeout())
                        .build(),
                meterRegistry);
    }

    HttpCadastroOwnershipClient(
            CadastroOwnershipProperties properties,
            ObjectMapper objectMapper,
            HttpClient httpClient,
            MeterRegistry meterRegistry) {
        this.properties = Objects.requireNonNull(properties, "properties must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
        this.httpClient = Objects.requireNonNull(httpClient, "httpClient must not be null");
        this.meterRegistry = Objects.requireNonNull(meterRegistry, "meterRegistry must not be null");
    }

    @Override
    public OwnershipSnapshot buscarOwnership(
            Set<UUID> obraIds,
            Set<UUID> fonogramaIds,
            String bearerToken) {
        CadastroOwnershipRequest request = new CadastroOwnershipRequest(
                normalizeIds(obraIds),
                normalizeIds(fonogramaIds));
        long startedAt = System.nanoTime();
        LOGGER.info(
                "distribuicao.cadastro_acl.started obraCount={} fonogramaCount={}",
                request.obraIds().size(),
                request.fonogramaIds().size());

        try {
            HttpResponse<String> response = httpClient.send(
                    buildRequest(request, bearerToken),
                    HttpResponse.BodyHandlers.ofString());
            return handleResponse(response, request, startedAt);
        } catch (HttpTimeoutException exception) {
            recordDuration(startedAt, "failure");
            recordFailure("integration-failure");
            logFailure(request, startedAt, "timeout", exception);
            throw new CadastroIntegrationException("Timeout ao consultar ownership snapshot no Cadastro", exception);
        } catch (ConnectException exception) {
            recordDuration(startedAt, "failure");
            recordFailure("integration-failure");
            logFailure(request, startedAt, "connection", exception);
            throw new CadastroIntegrationException("Falha de conexão ao consultar ownership snapshot no Cadastro", exception);
        } catch (IOException exception) {
            recordDuration(startedAt, "failure");
            recordFailure("integration-failure");
            logFailure(request, startedAt, "io", exception);
            throw new CadastroIntegrationException("Falha de infraestrutura ao consultar ownership snapshot no Cadastro", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            recordDuration(startedAt, "failure");
            recordFailure("integration-failure");
            logFailure(request, startedAt, "interrupted", exception);
            throw new CadastroIntegrationException("Consulta ao Cadastro foi interrompida", exception);
        }
    }

    private HttpRequest buildRequest(CadastroOwnershipRequest request, String bearerToken) throws JsonProcessingException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(ownershipUri())
                .timeout(properties.getReadTimeout())
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(request)));

        resolveAuthorizationHeader(bearerToken).ifPresent(token -> builder.header("Authorization", token));
        return builder.build();
    }

    private OwnershipSnapshot handleResponse(
            HttpResponse<String> response,
            CadastroOwnershipRequest request,
            long startedAt) {
        int statusCode = response.statusCode();
        if (statusCode >= 200 && statusCode < 300) {
            OwnershipSnapshot snapshot = mapResponse(response.body());
            long durationMs = elapsedMs(startedAt);
            recordDuration(startedAt, "success");
            LOGGER.info(
                    "distribuicao.cadastro_acl.succeeded obraCount={} fonogramaCount={} durationMs={}",
                    request.obraIds().size(),
                    request.fonogramaIds().size(),
                    durationMs);
            return snapshot;
        }
        if (statusCode == 404 || statusCode == 422) {
            recordDuration(startedAt, "failure");
            recordFailure("business-failure");
            logFailure(request, startedAt, "precondition status=" + statusCode, null);
            throw new PreRequisitosException("Cadastro rejeitou ownership snapshot para cálculo: " + response.body());
        }
        if (statusCode >= 500) {
            recordDuration(startedAt, "failure");
            recordFailure("integration-failure");
            logFailure(request, startedAt, "server status=" + statusCode, null);
            throw new CadastroIntegrationException("Cadastro indisponível ao consultar ownership snapshot");
        }

        recordDuration(startedAt, "failure");
        recordFailure("integration-failure");
        logFailure(request, startedAt, "unexpected status=" + statusCode, null);
        throw new CadastroIntegrationException("Resposta inesperada do Cadastro ao consultar ownership snapshot: " + statusCode);
    }

    private OwnershipSnapshot mapResponse(String body) {
        try {
            CadastroOwnershipResponse response = objectMapper.readValue(body, CadastroOwnershipResponse.class);
            return new OwnershipSnapshot(
                    nullToList(response.obras()).stream()
                            .map(this::mapObra)
                            .toList(),
                    nullToList(response.fonogramas()).stream()
                            .map(this::mapFonograma)
                            .toList());
        } catch (JsonProcessingException exception) {
            throw new CadastroIntegrationException("Cadastro retornou ownership snapshot inválido", exception);
        }
    }

    private ObraOwnership mapObra(CadastroObraResponse obra) {
        return new ObraOwnership(
                obra.obraId(),
                obra.titulo(),
                nullToList(obra.titularidades()).stream()
                        .map(this::mapTitularidade)
                        .toList());
    }

    private ParticipacaoOwnership mapTitularidade(CadastroTitularidadeResponse titularidade) {
        return new ParticipacaoOwnership(
                titularidade.titularId(),
                titularidade.nome(),
                CategoriaCredito.AUTORAL,
                null,
                requirePercentual(titularidade.percentual(), "Titularidade autoral sem percentual"));
    }

    private FonogramaOwnership mapFonograma(CadastroFonogramaResponse fonograma) {
        return new FonogramaOwnership(
                fonograma.fonogramaId(),
                fonograma.obraId(),
                nullToList(fonograma.participacoes()).stream()
                        .map(this::mapParticipacao)
                        .toList());
    }

    private ParticipacaoOwnership mapParticipacao(CadastroParticipacaoResponse participacao) {
        return new ParticipacaoOwnership(
                participacao.titularId(),
                participacao.nome(),
                CategoriaCredito.CONEXO,
                mapSubcategoriaConexa(participacao.categoria()),
                requirePercentual(participacao.percentual(), "Participação conexa sem percentual"));
    }

    private SubcategoriaConexa mapSubcategoriaConexa(String categoria) {
        String normalized = categoria == null ? "" : categoria.trim().toUpperCase();
        return switch (normalized) {
            case "PRODUTOR", "PRODUTOR_FONOGRAFICO" -> SubcategoriaConexa.PRODUTOR;
            case "MUSICO", "MUSICO_EXECUTANTE" -> SubcategoriaConexa.MUSICO;
            case "INTERPRETE" -> SubcategoriaConexa.INTERPRETE;
            default -> throw new CadastroIntegrationException("Categoria conexa desconhecida no snapshot: " + categoria);
        };
    }

    private BigDecimal requirePercentual(BigDecimal percentual, String message) {
        if (percentual == null) {
            throw new PreRequisitosException(message);
        }
        return percentual;
    }

    private java.util.Optional<String> resolveAuthorizationHeader(String bearerToken) {
        CadastroOwnershipProperties.TokenStrategy tokenStrategy = properties.getTokenStrategy();
        if (tokenStrategy != CadastroOwnershipProperties.TokenStrategy.SERVICE_ONLY && hasText(bearerToken)) {
            return java.util.Optional.of(normalizeBearerToken(bearerToken));
        }
        if (tokenStrategy != CadastroOwnershipProperties.TokenStrategy.ANALYST_ONLY && hasText(properties.getServiceToken())) {
            return java.util.Optional.of(normalizeBearerToken(properties.getServiceToken()));
        }
        return java.util.Optional.empty();
    }

    private String normalizeBearerToken(String token) {
        String trimmed = token.trim();
        if (trimmed.regionMatches(true, 0, "Bearer ", 0, "Bearer ".length())) {
            return trimmed;
        }
        return "Bearer " + trimmed;
    }

    private URI ownershipUri() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return URI.create(baseUrl + OWNERSHIP_SNAPSHOT_PATH);
    }

    private List<UUID> normalizeIds(Set<UUID> ids) {
        return Objects.requireNonNull(ids, "ids must not be null").stream()
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.comparing(UUID::toString))
                .toList();
    }

    private <T> List<T> nullToList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void logFailure(
            CadastroOwnershipRequest request,
            long startedAt,
            String reason,
            Exception exception) {
        long durationMs = elapsedMs(startedAt);
        if (exception == null) {
            LOGGER.warn(
                    "distribuicao.cadastro_acl.failed obraCount={} fonogramaCount={} durationMs={} reason={}",
                    request.obraIds().size(),
                    request.fonogramaIds().size(),
                    durationMs,
                    reason);
            return;
        }
        LOGGER.warn(
                "distribuicao.cadastro_acl.failed obraCount={} fonogramaCount={} durationMs={} reason={} exceptionClass={}",
                request.obraIds().size(),
                request.fonogramaIds().size(),
                durationMs,
                reason,
                exception.getClass().getSimpleName());
    }

    private void recordDuration(long startedAt, String outcome) {
        Timer.builder(CADASTRO_ACL_DURATION_METRIC)
                .tag("outcome", outcome)
                .register(meterRegistry)
                .record(System.nanoTime() - startedAt, TimeUnit.NANOSECONDS);
    }

    private void recordFailure(String failureType) {
        Counter.builder(CADASTRO_ACL_FAILURES_METRIC)
                .tag("type", failureType)
                .register(meterRegistry)
                .increment();
    }

    private long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }

    private record CadastroOwnershipRequest(List<UUID> obraIds, List<UUID> fonogramaIds) {
    }

    private record CadastroOwnershipResponse(
            List<CadastroObraResponse> obras,
            List<CadastroFonogramaResponse> fonogramas) {
    }

    private record CadastroObraResponse(
            UUID obraId,
            String titulo,
            String status,
            List<CadastroTitularidadeResponse> titularidades) {
    }

    private record CadastroTitularidadeResponse(
            UUID titularId,
            String nome,
            String associacaoSigla,
            String categoria,
            BigDecimal percentual) {
    }

    private record CadastroFonogramaResponse(
            UUID fonogramaId,
            UUID obraId,
            String status,
            List<CadastroParticipacaoResponse> participacoes) {
    }

    private record CadastroParticipacaoResponse(
            UUID titularId,
            String nome,
            String associacaoSigla,
            String categoria,
            BigDecimal percentual) {
    }
}
