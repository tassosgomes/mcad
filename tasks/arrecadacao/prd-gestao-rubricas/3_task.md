---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>authz</dependencies>
<unblocks>5.0</unblocks>
</task_context>

# Tarefa 3.0: Backend Arrecadação — API e Permissões

## Visão Geral

Expandir o `RubricaController` com novos endpoints, adicionar permissões dedicadas, e implementar validações de rubrica ativa nos fluxos de Licença e Pagamento.

## Requisitos

- 6 endpoints REST no `RubricaController`
- 4 novas permissões em `permissions.yaml`
- Validação de rubrica ativa em `Licenca.criar()`
- Validação de rubrica ativa em `RegistrarPagamentoCommandHandler`
- Atualizar `RubricaResumoResponse` para incluir `ativo`

## Subtarefas

- [ ] 3.1 Expandir `RubricaController`
  - `GET /api/v1/rubricas` — listar (atualizar para retornar `RubricaResponse` com `ativo`)
  - `GET /api/v1/rubricas/{id}` — buscar por ID
  - `POST /api/v1/rubricas` — criar
  - `PUT /api/v1/rubricas/{id}` — atualizar
  - `POST /api/v1/rubricas/{id}/inativar` — inativar
  - `POST /api/v1/rubricas/{id}/ativar` — ativar
  
- [ ] 3.2 Adicionar permissões em `permissions.yaml`
  ```yaml
  - key: arrecadacao:default:rubrica:visualizar
    name: Visualizar rubricas
    resource: rubrica
    action: visualizar
  - key: arrecadacao:default:rubrica:criar
    name: Criar rubrica
    resource: rubrica
    action: criar
  - key: arrecadacao:default:rubrica:editar
    name: Editar rubrica
    resource: rubrica
    action: editar
  - key: arrecadacao:default:rubrica:inativar
    name: Inativar rubrica
    resource: rubrica
    action: inativar
  ```
  
- [ ] 3.3 Atualizar `RubricaResumoResponse` e `RubricaResponse`
  - Incluir `boolean ativo`
  - Atualizar todos os mappers que constroem esses DTOs
  
- [ ] 3.4 Validar rubrica ativa em `Licenca.criar()`
  - Receber `RubricaRepository` como parâmetro ou injetar
  - Buscar rubrica por `rubricaId`
  - Se `!rubrica.isAtivo()`, lançar `IllegalStateException`
  - Mensagem: "Rubrica está inativa e não pode receber novas licenças"
  
- [ ] 3.5 Validar rubrica ativa em `RegistrarPagamentoCommandHandler`
  - Após buscar licença, verificar `licenca.getRubrica().isAtivo()`
  - Se inativa, retornar 422 com ProblemDetails
  - Mensagem: "Rubrica está inativa e não permite novos pagamentos"

## Detalhes de Implementação

### RubricaController

```java
@RestController
@RequestMapping("/api/v1/rubricas")
public class RubricaController {
    
    @GetMapping
    @RequiresPermission("arrecadacao:default:rubrica:visualizar")
    public ResponseEntity<List<RubricaResponse>> listar() { ... }
    
    @GetMapping("/{id}")
    @RequiresPermission("arrecadacao:default:rubrica:visualizar")
    public ResponseEntity<RubricaResponse> buscarPorId(@PathVariable UUID id) { ... }
    
    @PostMapping
    @RequiresPermission("arrecadacao:default:rubrica:criar")
    public ResponseEntity<RubricaResponse> criar(@Valid @RequestBody CriarRubricaRequest request) { ... }
    
    @PutMapping("/{id}")
    @RequiresPermission("arrecadacao:default:rubrica:editar")
    public ResponseEntity<RubricaResponse> atualizar(@PathVariable UUID id, 
        @Valid @RequestBody AtualizarRubricaRequest request) { ... }
    
    @PostMapping("/{id}/inativar")
    @RequiresPermission("arrecadacao:default:rubrica:inativar")
    public ResponseEntity<RubricaResponse> inativar(@PathVariable UUID id,
        @Valid @RequestBody InativarRubricaRequest request) { ... }
    
    @PostMapping("/{id}/ativar")
    @RequiresPermission("arrecadacao:default:rubrica:editar")
    public ResponseEntity<RubricaResponse> ativar(@PathVariable UUID id,
        @Valid @RequestBody InativarRubricaRequest request) { ... }
}
```

### Validação em Licenca.criar()

```java
public static Licenca criar(UUID usuarioMusicaId, UUID rubricaId, 
                             LocalDate dataInicio, LocalDate dataFim,
                             RubricaRepository rubricaRepository) {
    // ... validações existentes ...
    Rubrica rubrica = rubricaRepository.findById(rubricaId)
        .orElseThrow(() -> new EntidadeNaoEncontradaException("Rubrica não encontrada"));
    if (!rubrica.isAtivo()) {
        throw new IllegalStateException("Rubrica está inativa e não pode receber novas licenças");
    }
    // ... resto da criação ...
}
```

> **Nota:** Se injetar repository na entidade for inviável, mover validação para o `CriarLicencaCommandHandler`.

## Critérios de Sucesso

- [ ] Todos os endpoints respondem com HTTP correto e ProblemDetails em erro
- [ ] Permissões são registradas no authz na startup (verificar logs de `authz-spring-boot-starter`)
- [ ] Licença rejeita rubrica inativa com mensagem clara (HTTP 422)
- [ ] Pagamento rejeita licença de rubrica inativa com mensagem clara (HTTP 422)
- [ ] `RubricaResumoResponse` inclui `ativo` em todos os pontos de uso
