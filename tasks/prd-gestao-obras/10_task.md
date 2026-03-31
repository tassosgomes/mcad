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
<unblocks>"12.0, 13.0"</unblocks>
</task_context>

# Tarefa 10.0: Stitch — 7 Mockups no projeto mcad

## Visão Geral

Criar 7 screens de mockup no Stitch para Obras Musicais, incluindo os 3 estados da tela de detalhe (PENDENTE, LIBERADO, DEPURADA) e os modais de depuração e exclusão.

## Stitch Project

- **Projeto:** mcad — **ID:** `533156784329699726`
- **Design System:** Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`)

## Screens

1. **Obras - Listagem** — tabela paginada, 5 filtros, badges (5 status + 4 tipos), ISWC mono, link depurada
2. **Obras - Formulário Criar** — título, tipo (select 4 opções), gênero, subtítulo
3. **Obras - Detalhe PENDENTE** — campos editáveis + IswcSection (botão "Obter ISWC" habilitado/desabilitado)
4. **Obras - Detalhe LIBERADO** — campos editáveis (exceto título com aviso) + ISWC preenchido + toggle DP
5. **Obras - Detalhe DEPURADA** — todos read-only + banner "obra depurada" + link nova obra
6. **Obras - Modal Depuração** — confirmação com texto explicativo
7. **Obras - Modal Excluir** — confirmação padrão

## Arquivos de Referência

- `frontend/DESIGN.md`
- Stitch screens existentes de Associações e Titulares

## Critérios de Sucesso

- [ ] 7 screens criadas no Stitch (ID: `533156784329699726`)
- [ ] Consistente com screens existentes
- [ ] Badges: PENDENTE (warning), LIBERADO (success), BLOQUEADO (error), DOMINIO_PUBLICO (muted), DEPURADA (secondary)
- [ ] ISWC em JetBrains Mono
- [ ] Banner de depuração com link
- [ ] Botão "Obter ISWC" com 3 estados visuais
