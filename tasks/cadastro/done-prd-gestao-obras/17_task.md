---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/cadastro-api</domain>
<type>bugfix</type>
<scope>exception_handling</scope>
<complexity>low</complexity>
<dependencies>""</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 17.0: Fix — HTTP 422 → 409 para operações em obra DEPURADA

## Origem

Reteste QA 2026-04-09 — FALHA-B (qa_task_03 CT-07, qa_task_05 CT-05, qa_task_06 CT-05).
API Contract define 409 para operações bloqueadas por status, mas PUT retorna 422.

## Problema

PUT em obra com status DEPURADA retorna HTTP 422 (Unprocessable Entity) ao invés de HTTP 409 (Conflict) conforme o API Contract. O DELETE já retorna 409 corretamente — há inconsistência.

## Causa Raiz

Em `ObraMusical.cs:45-52`, o método `Atualizar()` lança `DomainException` para obras DEPURADA/DOMINIO_PUBLICO/BLOQUEADO. No `GlobalExceptionHandler.cs:43`, `DomainException` é mapeada para HTTP 422.

O correto seria lançar `ConflictException` (mapeada para 409 na linha 41) quando a operação é bloqueada pelo status da obra, pois é um conflito de estado — não uma validação de dados.

## Correção

Em `ObraMusical.cs`, alterar as exceções de status-blocking de `DomainException` para `ConflictException` nos métodos:

1. **`Atualizar()`** — linhas 48-52: status DEPURADA, DOMINIO_PUBLICO, BLOQUEADO
2. **`AlterarDominioPublico()`** — verificar se também lança DomainException para DEPURADA

Exemplo:
```csharp
// Antes
throw new DomainException("Obras depuradas não podem ser editadas");
// Depois
throw new ConflictException("Obras depuradas não podem ser editadas");
```

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` — métodos `Atualizar()` e `AlterarDominioPublico()`
- **Referência:**
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — mapeamento de exceções
  - `tasks/cadastro/prd-gestao-obras/api-contract.yaml` — contrato define 409 para estas operações

## Critérios de Sucesso (Verificáveis)

- [ ] `PUT /api/v1/obras/{id}` em obra DEPURADA → HTTP 409 (não 422)
- [ ] `PUT /api/v1/obras/{id}/dominio-publico` em obra DEPURADA → HTTP 409 (não 422)
- [ ] `DELETE /api/v1/obras/{id}` em obra DEPURADA → HTTP 409 (continua funcionando)
- [ ] Mensagens de erro no body permanecem iguais
- [ ] `dotnet build` compila sem erros
- [ ] Testes existentes continuam passando
