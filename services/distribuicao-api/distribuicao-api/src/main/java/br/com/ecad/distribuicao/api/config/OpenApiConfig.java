package br.com.ecad.distribuicao.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadados da documentacao OpenAPI (springdoc) do servico de Distribuicao.
 *
 * <p>Expoe a spec em {@code /v3/api-docs} e a UI em {@code /swagger-ui.html}.
 * O esquema de seguranca declarado e o Bearer JWT emitido pelo Logto.
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearer-jwt";

    @Bean
    OpenAPI distribuicaoOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Distribuicao API")
                .version("v1")
                .description("API REST do dominio de Distribuicao — processos de distribuicao, "
                    + "retencao e liberacao de creditos, ajustes e demonstrativos."))
            .components(new Components()
                .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .in(SecurityScheme.In.HEADER)
                    .description("Token JWT obtido via Logto. Informe apenas o token, "
                        + "sem o prefixo 'Bearer'.")))
            .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }
}
