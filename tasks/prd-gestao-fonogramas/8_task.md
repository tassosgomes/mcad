---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/design</domain>
<type>documentation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"10.0, 11.0"</unblocks>
</task_context>

# Tarefa 8.0: Stitch — 6 Mockups no projeto mcad

## Stitch Project

- **Projeto:** mcad — **ID:** `533156784329699726`
- **Design System:** Circuit Core Dark

## Screens

1. **Fonogramas - Listagem** — tabela paginada, ISRC mono, título obra, país, status badge (4 variantes), data. Filtros: ISRC, obra, status, país.
2. **Fonogramas - Criar** — ISRC (mono, validação formato), ObraSelect (autocomplete), país, datas.
3. **Fonogramas - Detalhe PENDENTE** — campos editáveis incluindo ISRC. Placeholder seção conexos (F06).
4. **Fonogramas - Detalhe LIBERADO** — ISRC read-only (alteração → depuração). País/datas editáveis.
5. **Fonogramas - Detalhe DEPURADO** — tudo read-only + banner + link novo.
6. **Obra Detalhe - Seção Fonogramas** — tabela simples (ISRC mono, status badge, país, data), botão "Novo Fonograma".

## Critérios de Sucesso

- [x] 6 screens criadas no Stitch
- [x] ISRC em JetBrains Mono
- [x] Badges: PENDENTE_VALIDACAO/PENDENTE_DOCUMENTACAO (warning), LIBERADO (success), DEPURADO (secondary)
- [x] Banner depuração com link
- [x] Consistente com screens existentes
