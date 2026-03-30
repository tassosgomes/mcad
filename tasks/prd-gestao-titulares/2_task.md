---
status: done
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"3.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain — Entidade Titular, Enums, ITitularRepository

## Relacionada às User Stories

- Todas as HUs — entidade base do CRUD

## Visão Geral

Criar a entidade `Titular` com Value Objects (Cpf?, Cnpj?, CaeIpi?), factory methods para PF e PJ, enums de tipo e status, interface do repositório com suporte a paginação/filtros e record de filtros.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Titular.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/TipoTitular.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/StatusTitular.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/ITitularRepository.cs`
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/` (Cpf, Cnpj, CaeIpi de 1.0)
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs` (FK referência)
  - `tasks/prd-gestao-titulares/techspec.md` (seção "Entidade Titular")
- **Skills:** `dotnet-architecture` — entidades, Repository Pattern

## Subtarefas

- [ ] 2.1 Criar enums `TipoTitular` (PF, PJ) e `StatusTitular` (Ativo, Falecido, Transferindo)
- [ ] 2.2 Criar entidade `Titular` com VOs, factory methods `CriarPessoaFisica` e `CriarPessoaJuridica`, método `Atualizar`, propriedades derivadas `Documento` e `DocumentoFormatado`
- [ ] 2.3 Criar record `TitularFiltro` (Page, Size, Sort, Nome, Documento, AssociacaoId, Status)
- [ ] 2.4 Criar interface `ITitularRepository` (ListarAsync, GetByIdAsync, ExisteDocumentoAsync, AddAsync, Update, Delete, PossuiVinculosAsync, SaveChangesAsync)
- [ ] 2.5 Verificar build: `dotnet build`

## Detalhes de Implementação

Entidade usa `Cpf?` e `Cnpj?` diretamente (não string). Factory methods garantem que PF tem Cpf preenchido e PJ tem Cnpj preenchido. Propriedade derivada `Documento` retorna `Cpf!.Valor` ou `Cnpj!.Valor`. Status default = `Ativo`. Timestamps `CriadoEm`/`AtualizadoEm` em UTC.

Conforme techspec.md seção "Entidade Titular (Domain Layer)".

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `Titular.CriarPessoaFisica(...)` cria titular com Tipo=PF, Cpf preenchido, Cnpj=null
- [ ] `Titular.CriarPessoaJuridica(...)` cria titular com Tipo=PJ, Cnpj preenchido, Cpf=null
- [ ] `titular.Documento` retorna valor correto do VO
- [ ] `titular.Atualizar(...)` atualiza AtualizadoEm
