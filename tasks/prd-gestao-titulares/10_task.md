---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"11.0, 13.0"</unblocks>
</task_context>

# Tarefa 10.0: Shared — apiClient (POST/PUT/DELETE) + useDebounce

## Visão Geral

Estender o apiClient existente com métodos para operações de escrita (POST, PUT, DELETE) e criar hook genérico useDebounce (300ms default) para filtros de texto.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/hooks/useDebounce.ts`
- **Modificar:**
  - `frontend/src/shared/services/apiClient.ts` — adicionar `apiPost<T>`, `apiPut<T>`, `apiDelete`
- **Referência:**
  - `tasks/prd-gestao-titulares/techspec-frontend.md` (seção "API Client — Extensão")
- **Skills:** `react-architecture` — hooks, services

## Subtarefas

- [ ] 10.1 Adicionar `apiPost<T>(path, body)`, `apiPut<T>(path, body)`, `apiDelete(path)` ao apiClient
- [ ] 10.2 Criar `useDebounce<T>(value, delay = 300)` hook genérico
- [ ] 10.3 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] apiPost/apiPut enviam Content-Type application/json
- [ ] apiDelete não tenta parsear body no 204
- [ ] useDebounce atualiza valor após delay
