---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/design</domain>
<type>documentation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 9.0: Stitch — 7 Mockups no projeto mcad

## Stitch Project

- **Projeto:** mcad — **ID:** `533156784329699726`
- **Design System:** Circuit Core Dark

## Screens

1. **Obra Detalhe — Botões status (PENDENTE)** — "Liberar" (success) + "Bloquear" (danger) no header
2. **Obra Detalhe — Checklist liberação** — 4 itens: Título ✅, Tipo ✅, ISWC ❌, Titularidades ❌ (80%)
3. **Obra Detalhe — BLOQUEADO** — banner error-container com justificativa, botão "Desbloquear", campos disabled
4. **Fonograma Detalhe — Botões (PENDENTE_DOC)** — "Liberar" + campo urlAudio preenchido
5. **Fonograma Detalhe — BLOQUEADO** — banner + justificativa
6. **Modal Bloquear** — textarea justificativa + Cancelar/Bloquear(danger)
7. **Histórico de Bloqueios** — lista: BLOQUEIO (justificativa) / DESBLOQUEIO + data

## Critérios de Sucesso

- [x] 7 screens criadas
- [x] Banner bloqueio com --color-error-container
- [x] Checklist com check verde / cross vermelho
- [x] Botão Liberar verde (success), Bloquear vermelho (danger)
