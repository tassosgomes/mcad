---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"2.0, 3.0, 4.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — Entidade ObraMusical, Enums, IObraRepository, IIswcService

## Relacionada às User Stories

- Todas as HUs — entidade base

## Visão Geral

Criar a entidade `ObraMusical` com 6 métodos de negócio (Criar, Atualizar, AtribuirIswc, Depurar, MarcarDominioPublico, RequerDepuracao), enums TipoObra e StatusObra, interfaces IObraRepository e IIswcService.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/TipoObra.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/StatusObra.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IObraRepository.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IIswcService.cs`
- **Referência:**
  - `tasks/prd-gestao-obras/techspec.md` (seção "Entidade ObraMusical")
  - `3-Domain/Cadastro.Domain/Entities/Titular.cs` (padrão factory methods)
- **Skills:** `dotnet-architecture` — entidades com lógica de domínio, factory methods

## Subtarefas

- [ ] 1.1 Criar enum `TipoObra` (Musical, Literomusical, Versao, PotPourri)
- [ ] 1.2 Criar enum `StatusObra` (Pendente, Liberado, Bloqueado, DominioPublico, Depurada)
- [ ] 1.3 Criar entidade `ObraMusical` com: factory `Criar()`, `Atualizar()` (rejeita DEPURADA/DP), `AtribuirIswc()` (rejeita se não PENDENTE ou já tem), `Depurar(novaObraId)` (rejeita se não LIBERADO), `MarcarDominioPublico(bool)`, `RequerDepuracao(novoTitulo)` — self-referencing FK `ObraDepuradaParaId`
- [ ] 1.4 Criar record `ObraFiltro` (Page, Size, Sort, Titulo, Iswc, Tipo, Status, Genero)
- [ ] 1.5 Criar interface `IObraRepository` (ListarAsync, GetByIdAsync, ExisteIswcAsync, AddAsync, Update, Delete, PossuiVinculosAsync, SaveChangesAsync)
- [ ] 1.6 Criar interface `IIswcService` (ObterIswcAsync(titulo, autores, associacaoSigla))
- [ ] 1.7 Verificar build: `dotnet build`

## Detalhes de Implementação

Conforme techspec.md seção "Entidade ObraMusical (Domain Layer)". Métodos lançam `DomainException` para violações de invariantes (ex: depurar obra que não é LIBERADO).

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Domain project continua com 0 PackageReferences
- [ ] `ObraMusical.Criar("Titulo", TipoObra.Musical)` retorna obra com status Pendente, ISWC null
- [ ] `obra.Depurar(novaId)` lança DomainException se status != Liberado
- [ ] `obra.AtribuirIswc("T-123")` lança DomainException se status != Pendente
- [ ] `obra.RequerDepuracao("novo titulo")` retorna true se Liberado e título diferente
