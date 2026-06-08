package br.com.ecad.arrecadacao.authz;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Valida a estrutura do <code>permissions.yaml</code> que o
 * <code>authz-spring-boot-starter</code> lê na inicialização para registrar
 * o catálogo no ecad-authz (POST /v1/permission-catalog/register).
 *
 * <p>Cobre CT-ARR-R07 do plano de testes da integração ecad-authz × MCAD.
 *
 * <p>Importante: este teste NÃO carrega ApplicationContext do Spring — ele
 * apenas parseia o YAML, garantindo que possa ser executado offline (sem
 * Docker, sem Postgres) e funcione como gate rápido de regressão para o
 * formato do catálogo (4-segmentos no domínio {@code arrecadacao:default}).
 */
class PermissionsCatalogStructureTest {

    private static final Path CATALOG_PATH =
            Path.of("..", "arrecadacao-api", "src", "main", "resources", "permissions.yaml");

    @Test
    @SuppressWarnings("unchecked")
    void permissionsYaml_DeveDeclarar17ChavesQuatroSegmentosDoDominioArrecadacao() throws Exception {
        Yaml yaml = new Yaml();
        Map<String, Object> loaded;
        try (InputStream is = Files.newInputStream(CATALOG_PATH)) {
            loaded = yaml.load(is);
        }

        List<Map<String, Object>> permissions = (List<Map<String, Object>>) loaded.get("permissions");

        assertThat(permissions)
                .as("catálogo de Arrecadação deve manter as 21 permissões 4-seg declaradas")
                .hasSize(21)
                .allSatisfy(
                        p -> {
                            String key = (String) p.get("key");
                            assertThat(key)
                                    .as(
                                            "toda chave deve seguir o padrão arrecadacao:default:<recurso>:<acao>")
                                    .startsWith("arrecadacao:default:")
                                    .matches("^arrecadacao:default:[a-z0-9\\-]+:[a-z0-9\\-]+$");
                        });

        List<String> keys = permissions.stream().map(p -> (String) p.get("key")).toList();
        assertThat(keys)
                .as("não deve haver chaves duplicadas no catálogo")
                .doesNotHaveDuplicates();
    }
}
