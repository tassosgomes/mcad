---
status: completed
parallelizable: true
blocked_by: ["2.0", "3.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Application — Commands (Adicionar, Editar, Remover) + Validators

## Relacionada às User Stories

- [HU-01] Adicionar, [HU-03] Editar, [HU-04] Remover, [HU-05] Depuração

## Visão Geral

3 commands com lógica de negócio: Adicionar (valida Editor=PJ, duplicata, status obra → depuração), Editar (percentual apenas, status obra → depuração), Remover (status obra → depuração). Todos retornam TitularidadesResponse completo com soma.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Titularidades/Commands/AdicionarTitularidadeCommand.cs` + Handler + Validator
  - `2-Application/.../Titularidades/Commands/EditarTitularidadeCommand.cs` + Handler + Validator
  - `2-Application/.../Titularidades/Commands/RemoverTitularidadeCommand.cs` + Handler
- **Referência:**
  - `tasks/prd-titularidades-autorais/techspec.md` (seção "Integração com Depuração")
  - `2-Application/.../Common/Exceptions/DepuracaoNecessariaException.cs` (existente de F03)
- **Skills:** `dotnet-architecture` — Commands; `dotnet-code-quality` — FluentValidation

## Subtarefas

- [ ] 5.1 `AdicionarTitularidadeCommand(Guid ObraId, Guid TitularId, string Categoria, decimal Percentual)` + Validator + Handler: busca obra (valida status: DEPURADA→reject, LIBERADO→DepuracaoNecessariaException), busca titular (valida existe), valida Editor=PJ (RN-11), valida duplicata (ExisteDuplicataAsync), cria entidade, save, retorna TitularidadesResponse completo
- [ ] 5.2 `EditarTitularidadeCommand(Guid ObraId, Guid Id, decimal Percentual)` + Validator + Handler: busca obra (valida status), busca titularidade, AlterarPercentual, save, retorna TitularidadesResponse
- [ ] 5.3 `RemoverTitularidadeCommand(Guid ObraId, Guid Id)` + Handler: busca obra (valida status), busca titularidade, delete, save, retorna TitularidadesResponse
- [ ] 5.4 Todos os handlers: após mutation, recalculam a lista completa via ListarTitularidadesQuery para retornar response com soma atualizada
- [ ] 5.5 Verificar build: `dotnet build`

## Detalhes de Implementação

### Validação de status da obra (comum aos 3 handlers)
```csharp
var obra = await _obraRepo.GetByIdAsync(cmd.ObraId, ct)
    ?? throw new NotFoundException(nameof(ObraMusical), cmd.ObraId);

if (obra.Status == StatusObra.Depurada)
    throw new DomainException("Obras depuradas não podem ser alteradas");
if (obra.Status == StatusObra.Liberado)
    throw new DepuracaoNecessariaException("Alterar titulares de uma obra LIBERADA requer depuração");
```

### Validação Editor=PJ (AdicionarHandler)
```csharp
var titular = await _titularRepo.GetByIdAsync(cmd.TitularId, ct)
    ?? throw new NotFoundException(nameof(Titular), cmd.TitularId);

if (Enum.Parse<CategoriaAutoral>(cmd.Categoria) == CategoriaAutoral.Editor && titular.Tipo == TipoTitular.PF)
    throw new DomainException("A categoria Editor exige titular Pessoa Jurídica");
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Adicionar: happy path retorna TitularidadesResponse com soma atualizada
- [ ] Adicionar: Editor + PF → DomainException (422)
- [ ] Adicionar: duplicata titular+categoria → ConflictException (409)
- [ ] Adicionar: obra LIBERADA → DepuracaoNecessariaException (409 DEPURACAO_NECESSARIA)
- [ ] Editar: happy path atualiza percentual
- [ ] Remover: happy path remove e retorna soma atualizada
