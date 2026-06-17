package br.com.ecad.arrecadacao.infra.services;

import br.com.ecad.arrecadacao.application.exceptions.StorageFilePendingScanException;
import br.com.ecad.arrecadacao.application.exceptions.StorageServiceException;
import br.com.ecad.arrecadacao.application.ports.StorageDownloadData;
import br.com.ecad.arrecadacao.application.ports.StorageFileClient;
import br.com.ecad.arrecadacao.application.ports.StorageFileMetadata;
import br.com.ecad.arrecadacao.application.ports.StorageUploadRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class HttpStorageFileClient implements StorageFileClient {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String tokenUrl;
    private final String clientId;
    private final String clientSecret;

    public HttpStorageFileClient(
            ObjectMapper objectMapper,
            @Value("${app.storage.base-url:https://storage.tasso.dev.br}") String baseUrl,
            @Value("${app.storage.logto-issuer:https://9lcinu.logto.app/oidc}") String logtoIssuer,
            @Value("${app.storage.client-id:}") String clientId,
            @Value("${app.storage.client-secret:}") String clientSecret
    ) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
        this.baseUrl = stripTrailingSlash(baseUrl);
        this.tokenUrl = stripTrailingSlash(logtoIssuer) + "/token";
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public StorageFileMetadata upload(StorageUploadRequest request) {
        String token = requestAccessToken();
        String boundary = "----mcad-boleto-" + UUID.randomUUID();
        byte[] body = multipartBody(boundary, request);
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/api/v1/files"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        JsonNode json = sendJson(httpRequest, 201);
        return new StorageFileMetadata(json.path("id").asText(), json.path("status").asText());
    }

    @Override
    public StorageDownloadData getDownloadUrl(String fileId) {
        String token = requestAccessToken();
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/api/v1/files/" + fileId + "/download"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        JsonNode json = sendJson(httpRequest, 200);
        return new StorageDownloadData(
                json.path("downloadUrl").asText(),
                Instant.parse(json.path("expiresAt").asText()));
    }

    private String requestAccessToken() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new StorageServiceException("Credenciais M2M do Storage Service nao configuradas");
        }
        String body = formBody(Map.of(
                "grant_type", "client_credentials",
                "client_id", clientId,
                "client_secret", clientSecret,
                "scope", "storage:read storage:write",
                "resource", baseUrl));
        HttpRequest request = HttpRequest.newBuilder(URI.create(tokenUrl))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        JsonNode json = sendJson(request, 200);
        String token = json.path("access_token").asText();
        if (token.isBlank()) {
            throw new StorageServiceException("LogTo nao retornou access_token para Storage Service");
        }
        return token;
    }

    private JsonNode sendJson(HttpRequest request, int expectedStatus) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 409) {
                throw new StorageFilePendingScanException("Arquivo ainda esta em verificacao antivirus no Storage Service");
            }
            if (response.statusCode() != expectedStatus) {
                throw new StorageServiceException("Storage Service retornou HTTP " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (IOException exception) {
            throw new StorageServiceException("Falha ao interpretar resposta do Storage Service", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new StorageServiceException("Chamada ao Storage Service foi interrompida", exception);
        }
    }

    private byte[] multipartBody(String boundary, StorageUploadRequest request) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        write(output, "--" + boundary + "\r\n");
        write(output, "Content-Disposition: form-data; name=\"file\"; filename=\"" + request.fileName() + "\"\r\n");
        write(output, "Content-Type: " + request.contentType() + "\r\n\r\n");
        output.writeBytes(request.content());
        write(output, "\r\n--" + boundary + "--\r\n");
        return output.toByteArray();
    }

    private String formBody(Map<String, String> values) {
        StringBuilder body = new StringBuilder();
        for (var entry : values.entrySet()) {
            if (!body.isEmpty()) {
                body.append('&');
            }
            body.append(encode(entry.getKey()))
                    .append('=')
                    .append(encode(entry.getValue()));
        }
        return body.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(value.getBytes(StandardCharsets.UTF_8));
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
