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
<unblocks>"2.0, 4.0, 5.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — TitularidadeAutoral, CategoriaAutoral, ITitularidadeRepository

## Visão Geral

Criar entidade de junção `TitularidadeAutoral` (obra↔titular com categoria e percentual), enum `CategoriaAutoral` e interface `ITitularidadeRepository`. Entidade tem factory `Criar` com validação de percentual e método `AlterarPercentual`.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/TitularidadeAutoral.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/CategoriaAutoral.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/ITitularidadeRepository.cs`
- **Referência:**
  - `tasks/prd-titularidades-autorais/techspec.md` (seções "Entidade", "Interface")
  - `3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` (FK)
  - `3-Domain/Cadastro.Domain/Entities/Titular.cs` (FK)
- **Skills:** `dotnet-architecture` — entidades de junção, factory methods

## Subtarefas

- [ ] 1.1 Criar enum `CategoriaAutoral` (Autor, Editor)
- [ ] 1.2 Criar entidade `TitularidadeAutoral` — Id, ObraId, TitularId, Categoria, Percentual (decimal 4 casas), CriadoEm. Factory `Criar()` valida percentual (0<p<=100, round 4 casas). Método `AlterarPercentual()`. Navigation: Obra, Titular.
- [ ] 1.3 Criar interface `ITitularidadeRepository` — GetByObraIdAsync, GetByIdAsync, ExisteDuplicataAsync, AddAsync, Update, Delete, CalcularSomaAsync, SaveChangesAsync
- [ ] 1.4 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Domain project com 0 PackageReferences
- [ ] `TitularidadeAutoral.Criar(obraId, titularId, Autor, 60.12345m)` → percentual arredondado para 60.1235
- [ ] `Criar` com percentual 0 → DomainException
- [ ] `Criar` com percentual 101 → DomainException
- [ ] `AlterarPercentual(75m)` → atualiza corretamente
