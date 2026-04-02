---
status: completed
parallelizable: false
blocked_by: ["10.0", "11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"13.0"</unblocks>
</task_context>

# Tarefa 12.0: Feature — SomaIndicator fix + ParticipacoesSection

## Visão Geral

Estender SomaIndicator (F04) com prop `pendente` para estado "Pendente" (antes do cálculo). Criar ParticipacoesSection — composição principal que orquestra todos os componentes e emite `onDepuracaoRequired`.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/participacoes/components/ParticipacoesSection.tsx` + `.module.css`
  - `features/cadastro/participacoes/index.ts`
- **Modificar:**
  - `features/cadastro/titularidades/components/SomaIndicator.tsx` — adicionar prop `pendente?: boolean`, exibir "Pendente" se true
- **Referência:**
  - `features/cadastro/titularidades/components/TitularidadesSection.tsx` (padrão composição)
  - `tasks/prd-participacao-conexa/techspec-frontend.md` (seção "ParticipacoesSection")

## Subtarefas

- [ ] 12.1 **SomaIndicator fix** — if `pendente` → exibir "Pendente" em badge muted (sem valor numérico)
- [ ] 12.2 **ParticipacoesSection** — props: fonogramaId, fonogramaStatus, onDepuracaoRequired. State: showAddForm, showRecalcularModal. Lógica: temInterprete/temProdutor derivados dos dados. isReadOnly se DEPURADO. handleCalcular: se somaCalculada → RecalcularModal, senão → executar. Mutations catch err.code === 'DEPURACAO_NECESSARIA' → onDepuracaoRequired(). Componentes: header + DesatualizadoBadge + AddForm + ParticipacoesTable + SomaIndicator + RecalcularModal.
- [ ] 12.3 Criar `index.ts` — exporta ParticipacoesSection + hooks
- [ ] 12.4 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] SomaIndicator com `pendente=true` exibe "Pendente" (não "0%")
- [ ] ParticipacoesSection orquestra todos os componentes
- [ ] "Calcular" com percentuais existentes → RecalcularModal
- [ ] Operação em LIBERADO → onDepuracaoRequired chamado
- [ ] Read-only em DEPURADO
