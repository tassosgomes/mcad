---
status: completed
parallelizable: false
blocked_by: ["12.0", "13.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 14.0: Integração — Routes + Sidebar + ObraDetailPage

## Visão Geral

Registrar 3 rotas de Fonogramas, adicionar "Fonogramas" na sidebar, integrar `ObraFonogramasSection` na ObraDetailPage (abaixo da TitularidadesSection).

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/index.tsx` — adicionar: `/fonogramas`, `/fonogramas/novo`, `/fonogramas/:id`
  - `shared/components/layout/sidebar/Sidebar.tsx` — adicionar "Fonogramas" no menu Cadastro (após Obras)
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — importar e renderizar `ObraFonogramasSection` abaixo de `TitularidadesSection`

## Subtarefas

- [x] 14.1 Adicionar 3 rotas no Cadastro index
- [x] 14.2 Sidebar: Cadastro > Associações > Titulares > Obras > **Fonogramas**
- [x] 14.3 ObraDetailPage: `<ObraFonogramasSection obraId={obra.id} obraStatus={obra.status} />` após TitularidadesSection
- [x] 14.4 Testar end-to-end com backend

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] Sidebar mostra "Fonogramas"
- [x] `/cadastro/fonogramas` exibe listagem
- [x] `/cadastro/fonogramas/novo?obraId=xxx` pré-seleciona obra
- [x] ObraDetailPage mostra seção "Fonogramas" com tabela + botão "Novo Fonograma"
- [x] Fluxo completo: criar obra → adicionar titulares → criar fonograma → depurar fonograma
