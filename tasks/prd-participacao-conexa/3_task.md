---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Domain Fix — Fonograma + PercentuaisDesatualizados

## Visão Geral

Adicionar property `PercentuaisDesatualizados` (bool) à entidade Fonograma com métodos `MarcarPercentuaisDesatualizados()` e `MarcarPercentuaisAtualizados()`.

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs` — adicionar property + 2 métodos

## Subtarefas

- [ ] 3.1 Adicionar `public bool PercentuaisDesatualizados { get; private set; }` (default false)
- [ ] 3.2 Método `MarcarPercentuaisDesatualizados()` → true + AtualizadoEm
- [ ] 3.3 Método `MarcarPercentuaisAtualizados()` → false + AtualizadoEm
- [ ] 3.4 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Fonograma default PercentuaisDesatualizados = false
