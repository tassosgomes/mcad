---
status: completed
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Header (nome + role badge + logout)

## Visão Geral

Adicionar ao Header existente: nome do usuário (do token), badge com role (Analista/Consultor) e botão de logout.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/shared/components/layout/header/Header.tsx` — +seção right com nome, badge, botão logout
  - `frontend/src/shared/components/layout/header/Header.module.css` — +estilos para right section

## Subtarefas

- [x] 7.1 Header: importar useAuth, extrair user.profile.name e roles
- [x] 7.2 Seção direita: `<span>{user.profile.name}</span>` + `<Badge>Analista/Consultor</Badge>` + `<button onClick={logout}><LogOut /></button>`
- [x] 7.3 CSS: flex right section com gap, botão logout ghost
- [x] 7.4 `npm run build`

## Evidências de Execução

- `frontend/src/shared/components/layout/header/Header.tsx` atualizado para consumir `useAuth`, renderizar nome do usuário, badge de role e botão de logout
- O nome exibido usa fallback seguro: `name`, depois `preferred_username`, depois `sub`
- O badge reflete a role principal do fluxo atual: `Analista` quando `hasRole('analista-cadastro')`, senão `Consultor`
- `frontend/src/shared/components/layout/header/Header.module.css` atualizado com seção direita flexível, tratamento responsivo do nome e botão logout no estilo ghost
- `npm run build` executado com sucesso em `frontend/`

## Critérios de Sucesso (Verificáveis)

- [x] Nome do usuário exibido no header
- [x] Badge "Analista" ou "Consultor" conforme role
- [x] Botão logout funciona (redirect para Keycloak)
