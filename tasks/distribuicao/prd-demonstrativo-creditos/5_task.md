---
status: pending
parallelizable: false
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>distribuicao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 5.0: DemonstrativoController + Authz

## Visao Geral

Cria o `DemonstrativoController` que conecta os dois query handlers aos endpoints HTTP, adiciona as duas permissoes em `permissions.yaml` e documenta no catalog de authz. Esta tarefa e o ultimo passo do backend antes dos testes de integracao.

## Requisitos

- Criar `DemonstrativoController` em `distribuicao-api/.../api/controllers/`
- Endpoint 1: `GET /api/v1/processos/{id}/demonstrativos` com parametros: titularNome, page, size, sort
- Endpoint 2: `GET /api/v1/processos/{id}/demonstrativos/{titularId}`
- Usar `@RequiresPermission` (authz-spring-boot-starter) — sem `@PreAuthorize`
- Adicionar 2 chaves em `distribuicao-api/src/main/resources/permissions.yaml`
- Atualizar `docs/authz/catalog/distribuicao.md` com secao Demonstrativo

## Subtarefas

- [ ] 5.1 Criar `DemonstrativoController.java` em `distribuicao-api/.../api/controllers/`
- [ ] 5.2 Implementar endpoint `GET /api/v1/processos/{id}/demonstrativos` com `@RequiresPermission("distribuicao:default:demonstrativo:listar")`
- [ ] 5.3 Implementar endpoint `GET /api/v1/processos/{id}/demonstrativos/{titularId}` com `@RequiresPermission("distribuicao:default:demonstrativo:visualizar")`
- [ ] 5.4 Validar parametro `size` maximo 100 (rejeitar com 400 se excedido)
- [ ] 5.5 Adicionar chaves `demonstrativo:listar` e `demonstrativo:visualizar` em `permissions.yaml`
- [ ] 5.6 Atualizar `docs/authz/catalog/distribuicao.md` com nova secao Demonstrativo

## Sequenciamento

- Bloqueado por: 3.0, 4.0
- Desbloqueia: 9.0
- Paralelizavel: Nao (depende dos dois handlers)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/
  controllers/DemonstrativoController.java              ← novo

distribuicao-api/src/main/resources/
  permissions.yaml                                       ← +2 chaves

docs/authz/catalog/
  distribuicao.md                                        ← +secao Demonstrativo
```

### DemonstrativoController — estrutura

```java
@RestController
@RequestMapping("/api/v1/processos")
@RequiredArgsConstructor
public class DemonstrativoController {

    private final ListarTitularesDemonstrativoQueryHandler listarHandler;
    private final ConsultarDemonstrativoTitularQueryHandler consultarHandler;

    @GetMapping("/{id}/demonstrativos")
    @RequiresPermission("distribuicao:default:demonstrativo:listar")
    public ResponseEntity<TitularesDemonstrativoPageResponse> listarTitulares(
            @PathVariable UUID id,
            @RequestParam(required = false) String titularNome,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "nome") String sort) {

        if (size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Parametro 'size' nao pode exceder 100");
        }

        var query = new ListarTitularesDemonstrativoQuery(id, titularNome, page, size, sort);
        return ResponseEntity.ok(listarHandler.handle(query));
    }

    @GetMapping("/{id}/demonstrativos/{titularId}")
    @RequiresPermission("distribuicao:default:demonstrativo:visualizar")
    public ResponseEntity<DemonstrativoTitularResponse> consultarDemonstrativo(
            @PathVariable UUID id,
            @PathVariable UUID titularId) {

        var query = new ConsultarDemonstrativoTitularQuery(id, titularId);
        return ResponseEntity.ok(consultarHandler.handle(query));
    }
}
```

### Adicoes em permissions.yaml

Adicionar no bloco correto (seguindo o padrao existente para outros recursos de distribuicao):

```yaml
- key: distribuicao:default:demonstrativo:listar
  name: Listar titulares do demonstrativo
  description: Permite listar os titulares com creditos em um processo de distribuicao

- key: distribuicao:default:demonstrativo:visualizar
  name: Visualizar demonstrativo por titular
  description: Permite visualizar o demonstrativo detalhado de um titular em um processo
```

### Tratamento de erros — GlobalExceptionHandler

O `GlobalExceptionHandler` existente ja trata `NotFoundException` → 404. Confirmar que esta mapeado antes de finalizar esta task.

## Criterios de Sucesso

- `GET /api/v1/processos/{id}/demonstrativos` retorna 200 com lista paginada para processo existente
- `GET /api/v1/processos/{id}/demonstrativos/{titularId}` retorna 200 para titular com creditos
- Ambos os endpoints retornam 403 quando usuario nao tem a permissao correspondente
- `size > 100` retorna 400
- Aplicacao inicializa sem erros (permissions.yaml validado no boot pelo authz-starter)
- `mvn -pl distribuicao-api compile` passa sem erros
