---
status: done
parallelizable: false
blocked_by: ["14.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 15.0: Integração — Routes + Sidebar

## Visão Geral

Registrar as 3 rotas de Obras no Cadastro routes, adicionar "Obras" na sidebar e testar end-to-end com backend.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/features/cadastro/index.tsx` — adicionar: `/obras`, `/obras/novo`, `/obras/:id`
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` — adicionar `{ label: 'Obras', path: '/cadastro/obras' }` em Cadastro (após Titulares)
- **Referência:**
  - `frontend/src/features/cadastro/index.tsx` (rotas existentes)
- **Skills:** `react-architecture`

## Subtarefas

- [ ] 15.1 Adicionar 3 rotas no Cadastro index
- [ ] 15.2 Adicionar "Obras" na sidebar (após "Titulares")
- [ ] 15.3 Testar end-to-end com backend rodando

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Sidebar: Cadastro > Associações > Titulares > **Obras**
- [ ] `/cadastro/obras` exibe listagem
- [ ] `/cadastro/obras/novo` exibe formulário
- [ ] `/cadastro/obras/{id}` exibe detalhe condicional por status
- [ ] Fluxo completo: criar → obter ISWC → depurar → verificar banner
