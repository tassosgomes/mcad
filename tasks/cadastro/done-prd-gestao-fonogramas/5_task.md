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

# Tarefa 5.0: Application — Commands (Criar, Atualizar, Excluir, Depurar) + Validators

## Visão Geral

4 commands. `AtualizarHandler` tem lógica: PENDENTE edição livre, LIBERADO+ISRC diferente → DepuracaoNecessariaException, país/datas livre em LIBERADO, DEPURADO rejeita. `ExcluirHandler` verifica PodeSerExcluido. `DepurarHandler` transacional (mesmo padrão de obra).

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Fonogramas/Commands/CriarFonogramaCommand.cs` + Handler + Validator
  - `2-Application/.../Fonogramas/Commands/AtualizarFonogramaCommand.cs` + Handler + Validator
  - `2-Application/.../Fonogramas/Commands/ExcluirFonogramaCommand.cs` + Handler
  - `2-Application/.../Fonogramas/Commands/DepurarFonogramaCommand.cs` + Handler
- **Referência:**
  - `2-Application/.../Obras/Commands/DepurarObraCommand.cs` (padrão depuração transacional)
- **Skills:** `dotnet-architecture` — Commands; `dotnet-code-quality` — FluentValidation

## Subtarefas

- [x] 5.1 `CriarFonogramaCommand` + Validator (isrc obrigatório, obraId, paisOrigem) + Handler: Isrc.Create (valida formato), ExisteIsrcAsync (unicidade), valida obra existe, Fonograma.Criar, save
- [x] 5.2 `AtualizarFonogramaCommand` + Validator + Handler: busca fonograma, Isrc.Create novo, se RequerDepuracao → DepuracaoNecessariaException. Se PENDENTE → Atualizar() livre. Se LIBERADO + apenas país/datas → Atualizar() ok. Se DEPURADO → DomainException.
- [x] 5.3 `ExcluirFonogramaCommand` + Handler: busca fonograma, se !PodeSerExcluido → ConflictException, delete, save
- [x] 5.4 `DepurarFonogramaCommand(Guid Id, string Isrc, string PaisOrigem, DateOnly? datas)` + Handler: valida LIBERADO, Isrc.Create novo, original.Depurar(novoId), Fonograma.Criar (mesma obra, novo ISRC, sem conexos), AddAsync, SaveChangesAsync (transacional), retorna DepuracaoFonogramaResponse
- [x] 5.5 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Criar: ISRC formato inválido → DomainException (422)
- [x] Criar: ISRC duplicado → ConflictException (409)
- [x] Atualizar PENDENTE + ISRC diferente → sucesso
- [x] Atualizar LIBERADO + ISRC diferente → DepuracaoNecessariaException (409)
- [x] Atualizar LIBERADO + apenas país → sucesso (sem depuração)
- [x] Excluir PENDENTE → sucesso
- [x] Excluir LIBERADO → ConflictException
- [x] Depurar: original DEPURADO + novo PENDENTE_VALIDACAO (mesma obra)
