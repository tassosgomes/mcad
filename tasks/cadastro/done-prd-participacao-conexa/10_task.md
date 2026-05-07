---
status: completed
parallelizable: false
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0"</unblocks>
</task_context>

# Tarefa 10.0: Feature — Componentes Simples (AddForm, CalcularButton, DesatualizadoBadge, RecalcularModal)

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/participacoes/components/AddParticipacaoForm.tsx` + `.module.css`
  - `features/cadastro/participacoes/components/CalcularButton.tsx` + `.module.css`
  - `features/cadastro/participacoes/components/DesatualizadoBadge.tsx` + `.module.css`
  - `features/cadastro/participacoes/components/RecalcularModal.tsx` + `.module.css`
- **Referência:**
  - `features/cadastro/titularidades/components/AddTitularidadeForm.tsx` (padrão autocomplete)
  - Stitch screens (task 8.0)
  - `frontend/DESIGN.md`

## Subtarefas

- [ ] 10.1 **AddParticipacaoForm** — Autocomplete (reutiliza `/titulares/busca` de F04) + Select categoria (3 opções: Intérprete, Produtor Fonográfico, Músico Executante). Botões Cancelar/Adicionar.
- [ ] 10.2 **CalcularButton** — Button primary. Desabilitado se falta intérprete ou produtor (tooltip contextual). Loading state.
- [ ] 10.3 **DesatualizadoBadge** — Badge warning "Percentuais desatualizados — clique Calcular para atualizar". Exibido quando `percentuaisDesatualizados=true`.
- [ ] 10.4 **RecalcularModal** — Modal "Os percentuais serão recalculados. Ajustes manuais serão perdidos. Continuar?" Botões Cancelar/Recalcular(danger).
- [ ] 10.5 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] CalcularButton desabilitado com tooltip correto
- [ ] DesatualizadoBadge exibido condicionalmente
- [ ] RecalcularModal funcional
