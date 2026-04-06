---
status: completed
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Queries, DTOs e Specification

## Relacionada as User Stories

- [HU-06] Consultar Usuarios (cobertura direta — ListarUsuariosMusicaQuery + Specification)
- [HU-07] Visualizar historico (cobertura direta — ListarHistoricoStatusQuery)
- [HU-08] Selecionar Usuario para licenca (suporte — BuscarUsuarioMusicaPorIdQuery)

## Visao Geral

Implementar as 3 queries com handlers, todos os DTOs de request/response (records), DTO generico de paginacao e a Specification para filtros dinamicos server-side. Os DTOs de request incluem Bean Validation annotations (@NotBlank, @Size, @NotNull) para validacao automatica pelo Spring.

## Requisitos

- 3 Queries: Listar (paginado), BuscarPorId, ListarHistoricoStatus
- UsuarioMusicaSpecification: 4 filtros combinaveis (razaoSocial, cnpj, status, cidade)
- Sort parser: campo com prefixo `-` para DESC
- DTOs response: UsuarioMusicaResponse, EnderecoResponse, ContatoResponse, HistoricoStatusResponse
- DTOs request: CriarUsuarioMusicaRequest, AtualizarUsuarioMusicaRequest, AlterarStatusRequest, EnderecoRequest, ContatoRequest
- PageResponse<T> e PaginationInfo genericos (reutilizaveis por F03+)
- Bean Validation nos requests: @NotBlank, @Size(min=3) razaoSocial, @Size(min=10) justificativa

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarUsuariosMusicaQuery.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/BuscarUsuarioMusicaPorIdQuery.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/ListarHistoricoStatusQuery.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarUsuariosMusicaQueryHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/BuscarUsuarioMusicaPorIdQueryHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarHistoricoStatusQueryHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/specification/UsuarioMusicaSpecification.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/UsuarioMusicaResponse.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/EnderecoResponse.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/ContatoResponse.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/HistoricoStatusResponse.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PageResponse.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/PaginationInfo.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/CriarUsuarioMusicaRequest.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/AtualizarUsuarioMusicaRequest.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/AlterarStatusRequest.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/EnderecoRequest.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/ContatoRequest.java`
  - `arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/queries/handlers/ListarUsuariosMusicaQueryHandlerTest.java`
- **Referencia:**
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UsuarioMusica.java`
  - `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.yaml` (schemas de response)
- **Skills para consultar:**
  - `java-architecture` — Specification Pattern, sort parsing
  - `java-code-quality` — records como DTOs, Bean Validation
  - `common-restful-api` — paginacao page/size, sort `-` prefix

## Subtarefas

- [x] 5.1 Criar DTOs response: UsuarioMusicaResponse, EnderecoResponse, ContatoResponse, HistoricoStatusResponse
- [x] 5.2 Criar DTOs request com Bean Validation: CriarUsuarioMusicaRequest, AtualizarUsuarioMusicaRequest, AlterarStatusRequest, EnderecoRequest, ContatoRequest
- [x] 5.3 Criar PageResponse<T> e PaginationInfo genericos
- [x] 5.4 Criar UsuarioMusicaSpecification (4 filtros: razaoSocial ILIKE, cnpj LIKE, status =, cidade ILIKE)
- [x] 5.5 Criar ListarUsuariosMusicaQuery + Handler (Specification + Pageable + sort parser)
- [x] 5.6 Criar BuscarUsuarioMusicaPorIdQuery + Handler
- [x] 5.7 Criar ListarHistoricoStatusQuery + Handler
- [x] 5.8 Testes unitarios do ListarUsuariosMusicaQueryHandler (filtros, paginacao)

## Sequenciamento

- Bloqueado por: 4.0 (CQRS foundation e repositorios)
- Desbloqueia: 6.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-06, RF-07, RF-14, RF-16, RF-17, RF-18, RF-19
- Evidencia esperada: queries com Specification retornam resultados filtrados; DTOs mapeiam corretamente

## Detalhes de Implementacao

**UsuarioMusicaSpecification:**
```java
public class UsuarioMusicaSpecification {
    public static Specification<UsuarioMusica> comFiltros(
            String razaoSocial, String cnpj,
            StatusUsuarioMusica status, String cidade) {
        return Specification.where(razaoSocialContem(razaoSocial))
                .and(cnpjContem(cnpj))
                .and(statusIgual(status))
                .and(cidadeContem(cidade));
    }

    private static Specification<UsuarioMusica> razaoSocialContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("razaoSocial")), "%" + valor.toLowerCase() + "%");
    }

    private static Specification<UsuarioMusica> cnpjContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String clean = valor.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        return (root, query, cb) ->
            cb.like(root.get("cnpj").get("valor"), "%" + clean + "%");
    }

    private static Specification<UsuarioMusica> statusIgual(StatusUsuarioMusica valor) {
        if (valor == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), valor);
    }

    private static Specification<UsuarioMusica> cidadeContem(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("endereco").get("cidade")), "%" + valor.toLowerCase() + "%");
    }
}
```

**Sort parser (prefixo `-` para DESC):**
```java
private Sort parseSort(String sortParam) {
    if (sortParam.startsWith("-")) {
        return Sort.by(Sort.Direction.DESC, sortParam.substring(1));
    }
    return Sort.by(Sort.Direction.ASC, sortParam);
}
```

**DTOs request com Bean Validation:**
```java
public record CriarUsuarioMusicaRequest(
    @NotBlank @Size(min = 3, max = 200) String razaoSocial,
    @Size(max = 200) String nomeFantasia,
    @NotBlank @Size(min = 14, max = 14) String cnpj,
    @NotNull @Valid EnderecoRequest endereco,
    @NotNull @Valid ContatoRequest contato
) {}

public record AlterarStatusRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
```

**Mapeamento Entity → Response:**
```java
private UsuarioMusicaResponse mapToResponse(UsuarioMusica entity) {
    return new UsuarioMusicaResponse(
        entity.getId(),
        entity.getRazaoSocial(),
        entity.getNomeFantasia(),
        entity.getCnpj().getValor(),
        entity.getCnpj().getFormatado(),
        mapEndereco(entity.getEndereco()),
        mapContato(entity.getContato()),
        entity.getStatus().name(),
        entity.getCriadoEm(),
        entity.getAtualizadoEm()
    );
}
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [x] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [x] Specification combina filtros com AND (null filters ignorados)
- [x] Sort parser: "razaoSocial" → ASC, "-razaoSocial" → DESC
- [x] Bean Validation: razaoSocial < 3 chars invalido, justificativa < 10 chars invalido
