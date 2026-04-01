---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"2.0, 4.0, 5.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — Value Object Isrc, Entidade Fonograma, StatusFonograma, IFonogramaRepository

## Visão Geral

Criar VO `Isrc` (record, formato CC-XXX-YY-NNNNN, 12 chars alfanumérico), entidade `Fonograma` com depuração (mesmo padrão de ObraMusical), enum `StatusFonograma` e interface do repositório.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Isrc.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/StatusFonograma.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IFonogramaRepository.cs`
- **Referência:**
  - `tasks/prd-gestao-fonogramas/techspec.md` (seções "Value Object Isrc", "Entidade Fonograma")
  - `3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs` (padrão VO record)
  - `3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` (padrão depuração)
- **Skills:** `dotnet-architecture` — Value Objects, entidades com lógica

## Subtarefas

- [x] 1.1 Criar enum `StatusFonograma` (PendenteValidacao, PendenteDocumentacao, Liberado, Depurado)
- [x] 1.2 Criar `Isrc` record — factory `Create()`, validação: 12 chars, posições 0-1 letras, 5-6 dígitos, 7-11 dígitos. Propriedade `Formatado` (CC-XXX-YY-NNNNN). Armazena sem hífens.
- [x] 1.3 Criar entidade `Fonograma` — Id, Isrc (VO), ObraId (FK imutável), PaisOrigem, DataGravacao?, DataLancamento?, Status, FonogramaDepuradoParaId (self-ref). Factory `Criar(isrc, obraId, pais, datas)` → PENDENTE_VALIDACAO. `Atualizar()` rejeita DEPURADO. `RequerDepuracao(novoIsrc)` → true se LIBERADO + ISRC diferente. `Depurar(novoId)` → DEPURADO. Property `PodeSerExcluido`.
- [x] 1.4 Criar record `FonogramaFiltro` (Page, Size, Sort, Isrc, ObraId, ObraTitulo, Status, Pais)
- [x] 1.5 Criar interface `IFonogramaRepository` (ListarAsync, GetByObraIdAsync, GetByIdAsync, ExisteIsrcAsync, AddAsync, Update, Delete, SaveChangesAsync)
- [x] 1.6 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] `Isrc.Create("BRABC2312345")` → válido, Formatado = "BR-ABC-23-12345"
- [x] `Isrc.Create("INVALIDO")` → DomainException
- [x] `Fonograma.Criar(isrc, obraId, "Brasil")` → PENDENTE_VALIDACAO
- [x] `fonograma.Depurar(novoId)` com status != LIBERADO → DomainException
- [x] `fonograma.PodeSerExcluido` → true se PENDENTE, false se LIBERADO/DEPURADO
