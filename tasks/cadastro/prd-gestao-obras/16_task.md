---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/cadastro-api</domain>
<type>bugfix</type>
<scope>query_filter</scope>
<complexity>low</complexity>
<dependencies>""</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 16.0: Fix — Filtro ISWC parcial na listagem de obras

## Origem

Reteste QA 2026-04-09 — FALHA-A (qa_task_02 CT-06).
RF-13 especifica filtro por ISWC parcial, mas a implementação usa match exato.

## Problema

`GET /api/v1/obras?iswc=T-721` retorna 0 resultados. Apenas o valor exato (`?iswc=T-721428352-3`) funciona. O requisito RF-13 define "ISWC (parcial)".

## Causa Raiz

`ObraRepository.cs:31-32` usa operador `==` (match exato):

```csharp
if (!string.IsNullOrWhiteSpace(filtro.Iswc))
    query = query.Where(o => o.Iswc == filtro.Iswc);
```

## Correção

Alterar para `Contains` (case-insensitive) para busca parcial, consistente com o filtro de título que já usa `Contains`:

```csharp
if (!string.IsNullOrWhiteSpace(filtro.Iswc))
    query = query.Where(o => o.Iswc != null && o.Iswc.Contains(filtro.Iswc));
```

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` — linha 31-32

## Critérios de Sucesso (Verificáveis)

- [ ] `GET /api/v1/obras?iswc=T-721` retorna obras cujo ISWC contém "T-721"
- [ ] `GET /api/v1/obras?iswc=T-721428352-3` (exato) continua funcionando
- [ ] `dotnet build` compila sem erros
- [ ] Testes existentes continuam passando
