package br.com.ecad.distribuicao.infra.cadastro;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.integrations.cadastro")
public class CadastroOwnershipProperties {

    private String baseUrl = "http://localhost:5001";
    private TokenStrategy tokenStrategy = TokenStrategy.ANALYST_OR_SERVICE;
    private String serviceToken;
    private Duration connectTimeout = Duration.ofSeconds(2);
    private Duration readTimeout = Duration.ofSeconds(10);

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public TokenStrategy getTokenStrategy() {
        return tokenStrategy;
    }

    public void setTokenStrategy(TokenStrategy tokenStrategy) {
        this.tokenStrategy = tokenStrategy;
    }

    public String getServiceToken() {
        return serviceToken;
    }

    public void setServiceToken(String serviceToken) {
        this.serviceToken = serviceToken;
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public Duration getReadTimeout() {
        return readTimeout;
    }

    public void setReadTimeout(Duration readTimeout) {
        this.readTimeout = readTimeout;
    }

    public enum TokenStrategy {
        ANALYST_OR_SERVICE,
        ANALYST_ONLY,
        SERVICE_ONLY
    }
}
