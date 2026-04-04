---
status: pending
parallelizable: false
blocked_by: [5.0, 6.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>none</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Componentes

## Visão Geral

Implementar 5 componentes: PendentesTable, PendentesFilters, ImpactoView (accordion), ResolverPendenteModal (reutiliza BuscaCadastroAutocomplete) e ResolverLoteModal (checkboxes + resultado parcial).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/pendentes/components/PendentesTable.tsx` + `.module.css`
  - `frontend/src/features/identificacao/pendentes/components/PendentesFilters.tsx` + `.module.css`
  - `frontend/src/features/identificacao/pendentes/components/ImpactoView.tsx` + `.module.css`
  - `frontend/src/features/identificacao/pendentes/components/ResolverPendenteModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/pendentes/components/ResolverLoteModal.tsx` + `.module.css`
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/BuscaCadastroAutocomplete.tsx` (reutilizar)
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.tsx` (padrão tabela)
  - `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.tsx` (padrão filtros)

## Subtarefas

- [ ] 7.1 Criar `PendentesTable` + CSS — colunas: título/ISRC, captação (link), responsável, horário, qtd, botão "Resolver". Link na captação → `/identificacao/captacoes/{id}`
- [ ] 7.2 Criar `PendentesFilters` + CSS — filtros: captação (select), rubrica (select), período (date range), ISRC/ISWC (texto com debounce)
- [ ] 7.3 Criar `ImpactoView` + CSS — accordion por ISRC/ISWC, drill-down com captações, badges (totalExecucoes, totalCaptacoes), botão "Resolver todas"
- [ ] 7.4 Criar `ResolverPendenteModal` + CSS — preview da execução + BuscaCadastroAutocomplete + botão confirmar. Tratamento OBRA_NAO_LIBERADA → toast
- [ ] 7.5 Criar `ResolverLoteModal` + CSS — step 1: selecionar obra (autocomplete), step 2: lista checkboxes (todas marcadas, FECHADAS desabilitadas), step 3: confirmar. Resultado: "12 resolvidas, 3 rejeitadas" + detalhes

## Sequenciamento

- Bloqueado por: 5.0 (mockups), 6.0 (hooks)
- Desbloqueia: 8.0
- Paralelizável: Não

## Detalhes de Implementação

**PendentesTable — link para captação:**
```tsx
<td>
  <Link to={`/identificacao/captacoes/${pendente.captacaoId}`}>
    {pendente.captacaoRubrica} — {formatDate(pendente.captacaoPeriodo)}
  </Link>
</td>
```

**ImpactoView — accordion:**
```tsx
{data.map(item => (
  <div key={item.identificador} className={styles.impactoItem}>
    <button onClick={() => toggleExpand(item.identificador)} className={styles.impactoHeader}>
      <span>{item.tipoIdentificador === 'isrc' ? '🎵' : '📝'} {item.identificador}</span>
      <Badge>{item.totalExecucoes} exec</Badge>
      <Badge variant="warning">{item.totalCaptacoes} captações</Badge>
      <Button size="sm" onClick={(e) => { e.stopPropagation(); openLoteModal(item); }}>
        Resolver todas
      </Button>
    </button>
    {expanded === item.identificador && (
      <div className={styles.impactoDrilldown}>
        {item.captacoes.map(c => (
          <div key={c.captacaoId}>
            <Link to={`/identificacao/captacoes/${c.captacaoId}`}>{c.rubrica} — {c.periodo}</Link>
            <span>{c.execucoesPendentes} pendentes</span>
          </div>
        ))}
      </div>
    )}
  </div>
))}
```

**ResolverLoteModal — checkboxes:**
```tsx
// Step 2: lista de execuções com checkboxes
{execucoes.map(exec => (
  <label key={exec.id} className={exec.captacaoStatus !== 'ABERTA' ? styles.disabled : ''}>
    <input
      type="checkbox"
      checked={selecionadas.includes(exec.id)}
      disabled={exec.captacaoStatus !== 'ABERTA'}
      onChange={() => toggleSelecionada(exec.id)}
    />
    {exec.captacaoRubrica} — {exec.captacaoPeriodo} — {exec.inicio}
    {exec.captacaoStatus !== 'ABERTA' && <span className={styles.motivo}>(captação {exec.captacaoStatus})</span>}
  </label>
))}

// Step 3: resultado
{resultado && (
  <div>
    <p>✅ {resultado.resolvidas} resolvidas</p>
    {resultado.rejeitadas > 0 && <p>❌ {resultado.rejeitadas} rejeitadas</p>}
    {resultado.detalhesRejeitadas.map(r => (
      <p key={r.execucaoId}>— {r.motivo}</p>
    ))}
  </div>
)}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Link na captação navega corretamente
- [ ] Accordion expande/colapsa
- [ ] ResolverLoteModal: checkboxes, FECHADAS desabilitadas, resultado parcial
- [ ] BuscaCadastroAutocomplete reutilizado sem duplicação
