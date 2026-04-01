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
<unblocks>"2.0, 4.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — ParticipacaoConexa, CategoriaConexo, IParticipacaoRepository

## Visão Geral

Criar entidade de junção `ParticipacaoConexa` (fonograma↔titular com categoria e percentual nullable), enum `CategoriaConexo` e interface do repositório. Percentual `null` = não calculado. Método `AjustarPercentualManual` rejeita músicos.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ParticipacaoConexa.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/CategoriaConexo.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IParticipacaoRepository.cs`
- **Referência:**
  - `tasks/prd-participacao-conexa/techspec.md` (seções "Entidade", "Interface")
  - `3-Domain/.../Entities/TitularidadeAutoral.cs` (padrão junção)
- **Skills:** `dotnet-architecture`

## Subtarefas

- [ ] 1.1 Criar enum `CategoriaConexo` (Interprete, ProdutorFonografico, MusicoExecutante)
- [ ] 1.2 Criar entidade `ParticipacaoConexa` — Id, FonogramaId, TitularId, Categoria, Percentual (decimal? nullable), CriadoEm. Factory `Criar()` com Percentual=null. `DefinirPercentual(decimal)` valida range. `AjustarPercentualManual(decimal)` rejeita músico com DomainException. Property `Editavel` (true para intérprete/produtor).
- [ ] 1.3 Criar interface `IParticipacaoRepository` (GetByFonogramaIdAsync, GetByIdAsync, ExisteDuplicataAsync, AddAsync, Delete, SaveChangesAsync)
- [ ] 1.4 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `ParticipacaoConexa.Criar(...)` retorna Percentual=null
- [ ] `AjustarPercentualManual` com MusicoExecutante → DomainException
- [ ] `AjustarPercentualManual` com Interprete → ok
- [ ] `Editavel` → true para Interprete/Produtor, false para Musico
