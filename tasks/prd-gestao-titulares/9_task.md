---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/design</domain>
<type>documentation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 9.0: Stitch — 4 Mockups no projeto mcad

## Visão Geral

Criar 4 screens de mockup no Stitch para a feature Titulares, seguindo obrigatoriamente as diretrizes do `frontend/DESIGN.md` (Circuit Core Dark). As screens servem como referência pixel-perfect para implementação.

## Stitch Project

- **Projeto:** mcad
- **ID:** `533156784329699726`
- **Design System:** Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`)
- **Referência existente:** Screen Associações (ID: `28d9d5dde6be44c0b3b307bb311051c0`)

## Screens a Criar

### Screen 1: Titulares - Listagem
- PageHeader com título "Titulares", descrição, botão "Novo Titular" (primary)
- Barra de filtros: TextInput (nome), TextInput (documento), Select (associação), Select (status)
- Tabela paginada: colunas Nome, Tipo (badge PF/PJ), Documento (mono), Associação (sigla), Status (badge), Ações (editar/excluir)
- Componente de paginação: "Mostrando 1-20 de 142" + prev/next
- Badges: ATIVO (success), FALECIDO (muted), TRANSFERINDO (warning), PF (secondary), PJ (accent)

### Screen 2: Titulares - Formulário Criar
- PageHeader "Novo Titular"
- Toggle/Select tipo: Pessoa Física / Pessoa Jurídica
- Campos: Nome, CPF ou CNPJ (com máscara e validação inline), Nacionalidade, Associação (dropdown), CAE/IPI (opcional)
- Botões: Cancelar (secondary) | Salvar (primary)
- Estado de erro inline no campo CPF/CNPJ

### Screen 3: Titulares - Formulário Editar
- PageHeader "Editar Titular"
- Campos tipo e documento DISABLED (visual read-only)
- Mesmos campos editáveis + Select de status (ATIVO/FALECIDO/TRANSFERINDO)

### Screen 4: Titulares - Modal Excluir
- Overlay escuro sobre listagem
- Modal card: "Excluir Titular?"
- Texto: "Tem certeza que deseja excluir o titular **{nome}**? Esta ação não pode ser desfeita."
- Botões: Cancelar (secondary) | Excluir (danger)

## Arquivos Envolvidos

- **Referência (não alterar):**
  - `frontend/DESIGN.md` — tokens, cores, princípios, componentes
  - Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` — padrão visual (Associações)
  - `tasks/prd-gestao-titulares/techspec-frontend.md` — seção "Stitch"
- **Skills:** `frontend-design` — direção estética, componentes, layout

## Subtarefas

- [ ] 9.1 Criar screen "Titulares - Listagem" no Stitch
- [ ] 9.2 Criar screen "Titulares - Formulário Criar" no Stitch
- [ ] 9.3 Criar screen "Titulares - Formulário Editar" no Stitch
- [ ] 9.4 Criar screen "Titulares - Modal Excluir" no Stitch

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 14.0 (componentes usam mockups como referência)
- Paralelizável: Sim — independente de todo o backend e frontend dev

## Critérios de Sucesso (Verificáveis)

- [ ] 4 screens criadas no projeto Stitch (ID: `533156784329699726`)
- [ ] Todas usam tokens do DESIGN.md (cores, tipografia, espaçamento)
- [ ] Consistente com a screen de Associações existente (layout, sidebar, header)
- [ ] CPF/CNPJ em JetBrains Mono
- [ ] Badges de status e tipo com cores corretas
- [ ] Regra "No-Line" respeitada
