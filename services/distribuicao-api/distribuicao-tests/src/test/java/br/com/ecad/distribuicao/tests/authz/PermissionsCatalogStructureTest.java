package br.com.ecad.distribuicao.tests.authz;

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
 * o catálogo no ecad-authz.
 *
 * <p>Cobre CT-DIS-R05 do plano de testes da integração ecad-authz × MCAD:
 * 13 chaves 4-segmentos no domínio {@code distribuicao:default}
 * (2 rubrica + 7 processo + 2 ajuste + 2 demonstrativo).
 */
class PermissionsCatalogStructureTest {

    private static final Path CATALOG_PATH =
            Path.of("..", "distribuicao-api", "src", "main", "resources", "permissions.yaml");

    @Test
    @SuppressWarnings("unchecked")
    void permissionsYaml_DeveDeclarar9ChavesQuatroSegmentosDoDominioDistribuicao() throws Exception {
        Yaml yaml = new Yaml();
        Map<String, Object> loaded;
        try (InputStream is = Files.newInputStream(CATALOG_PATH)) {
            loaded = yaml.load(is);
        }

        List<Map<String, Object>> permissions = (List<Map<String, Object>>) loaded.get("permissions");

        assertThat(permissions)
                .as("catálogo de Distribuição deve manter as 13 permissões 4-seg declaradas")
                .hasSize(13)
                .allSatisfy(
                        p -> {
                            String key = (String) p.get("key");
                            assertThat(key)
                                    .as(
                                            "toda chave deve seguir o padrão distribuicao:default:<recurso>:<acao>")
                                    .startsWith("distribuicao:default:")
                                    .matches("^distribuicao:default:[a-z0-9\\-]+:[a-z0-9\\-]+$");
                        });

        List<String> keys = permissions.stream().map(p -> (String) p.get("key")).toList();
        assertThat(keys)
                .as("não deve haver chaves duplicadas no catálogo")
                .doesNotHaveDuplicates();

        // Smoke check: confirma que ambos recursos esperados (rubrica e processo) estão presentes.
        assertThat(keys).contains(
                "distribuicao:default:rubrica:listar",
                "distribuicao:default:processo:listar",
                "distribuicao:default:processo:calcular");
    }
}
