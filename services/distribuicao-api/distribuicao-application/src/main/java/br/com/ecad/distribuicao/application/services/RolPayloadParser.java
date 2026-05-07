package br.com.ecad.distribuicao.application.services;

import br.com.ecad.distribuicao.domain.calculo.ExecucaoRol;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Component;

@Component
public class RolPayloadParser {

    private final ObjectMapper objectMapper;

    public RolPayloadParser(ObjectMapper objectMapper) {
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    public ParsedRol parse(String payload) {
        if (payload == null || payload.isBlank()) {
            throw new PreRequisitosException("Payload do Rol é obrigatório para cálculo");
        }

        JsonNode execucoesNode = findExecucoes(readPayload(payload));
        List<ExecucaoRol> execucoes = StreamSupport.stream(execucoesNode.spliterator(), false)
                .map(this::parseExecucao)
                .toList();
        if (execucoes.isEmpty()) {
            throw new PreRequisitosException("Payload do Rol não contém execuções");
        }

        Set<UUID> obraIds = new LinkedHashSet<>();
        Set<UUID> fonogramaIds = new LinkedHashSet<>();
        for (ExecucaoRol execucao : execucoes) {
            obraIds.add(execucao.obraId());
            if (execucao.fonogramaId() != null) {
                fonogramaIds.add(execucao.fonogramaId());
            }
        }
        return new ParsedRol(execucoes, obraIds, fonogramaIds);
    }

    private JsonNode readPayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception exception) {
            throw new PreRequisitosException("Payload do Rol possui JSON inválido");
        }
    }

    private JsonNode findExecucoes(JsonNode root) {
        JsonNode execucoes = firstExisting(root, "execucoes", "Execucoes");
        if (isArray(execucoes)) {
            return execucoes;
        }

        JsonNode data = firstExisting(root, "data", "Data");
        if (data != null) {
            execucoes = firstExisting(data, "execucoes", "Execucoes");
            if (isArray(execucoes)) {
                return execucoes;
            }
        }
        throw new PreRequisitosException("Payload do Rol não contém a lista de execuções");
    }

    private ExecucaoRol parseExecucao(JsonNode node) {
        UUID obraId = requiredUuid(node, "obraId", "ObraId");
        UUID fonogramaId = optionalUuid(node, "fonogramaId", "FonogramaId").orElse(null);
        int quantidade = requiredInt(node, "quantidade", "Quantidade", "quantidadeExecucoes", "QuantidadeExecucoes");
        BigDecimal peso = optionalDecimal(node, "peso", "Peso", "pesoTipoUtilizacao", "PesoTipoUtilizacao")
                .orElse(BigDecimal.ONE);
        String obraTitulo = optionalText(node, "obraTitulo", "ObraTitulo", "tituloObra", "TituloObra", "titulo", "Titulo")
                .orElse("Obra " + obraId);
        return new ExecucaoRol(obraId, obraTitulo, fonogramaId, quantidade, peso);
    }

    private UUID requiredUuid(JsonNode node, String... fieldNames) {
        return optionalUuid(node, fieldNames)
                .orElseThrow(() -> new PreRequisitosException("Execução do Rol sem obraId"));
    }

    private java.util.Optional<UUID> optionalUuid(JsonNode node, String... fieldNames) {
        return optionalText(node, fieldNames).map(value -> {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException exception) {
                throw new PreRequisitosException("Identificador inválido no payload do Rol: " + value);
            }
        });
    }

    private int requiredInt(JsonNode node, String... fieldNames) {
        JsonNode value = firstExisting(node, fieldNames);
        if (value == null || value.isNull()) {
            throw new PreRequisitosException("Execução do Rol sem quantidade");
        }
        if (value.isNumber()) {
            return value.intValue();
        }
        try {
            return Integer.parseInt(value.asText());
        } catch (NumberFormatException exception) {
            throw new PreRequisitosException("Quantidade inválida no payload do Rol");
        }
    }

    private java.util.Optional<BigDecimal> optionalDecimal(JsonNode node, String... fieldNames) {
        return optionalText(node, fieldNames).map(value -> {
            try {
                return new BigDecimal(value);
            } catch (NumberFormatException exception) {
                throw new PreRequisitosException("Peso inválido no payload do Rol");
            }
        });
    }

    private java.util.Optional<String> optionalText(JsonNode node, String... fieldNames) {
        JsonNode value = firstExisting(node, fieldNames);
        if (value == null || value.isNull()) {
            return java.util.Optional.empty();
        }
        String text = value.asText();
        if (text == null || text.isBlank()) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(text.trim());
    }

    private JsonNode firstExisting(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = node.get(fieldName);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private boolean isArray(JsonNode node) {
        return node != null && node.isArray();
    }
}
