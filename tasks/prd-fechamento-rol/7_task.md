---
status: completed
parallelizable: false
blocked_by: [4.0, 5.0, 6.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"none"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Componentes + Integração CaptacaoDetailPage

## Visão Geral

Criar FecharRolButton, FecharRolModal com ChecklistPreRequisitos, e integrar na CaptacaoDetailPage. Estado pós-fechamento oculta botões de edição. Task final da F05.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/components/FecharRolButton.tsx`
  - `frontend/src/features/identificacao/captacoes/components/FecharRolModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/ChecklistPreRequisitos.tsx` + `.module.css`
- **Modificar:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` (botão no header + modal + estado pós-fechamento)

## Subtarefas

- [x] 7.1 Criar `ChecklistPreRequisitos` + CSS — lista ✅/❌ com detalhe, resumo (total, identificadas, rubrica)
- [x] 7.2 Criar `FecharRolModal` + CSS — abre → consulta pré-requisitos → exibe checklist → botão habilitado se todosAtendidos → confirma → toast
- [x] 7.3 Criar `FecharRolButton` — botão primary, visível se ABERTA + dono
- [x] 7.4 Integrar na CaptacaoDetailPage: botão no header, modal, estado FECHADA (ocultar edição/exclusão/adicionar)
- [x] 7.5 Teste end-to-end manual:
  - Captação com todos pré-req OK → checklist ✅ → fechar → FECHADA → botões ocultos
  - Captação com pendentes → checklist ❌ → botão desabilitado
  - Captação audiovisual sem tipo utilização → checklist ❌
  - Consultor → botão não visível

## Sequenciamento

- Bloqueado por: 4.0 (backend), 5.0 (mockups), 6.0 (hooks)
- Desbloqueia: Nenhum (task final)
- Paralelizável: Não

## Detalhes de Implementação

**ChecklistPreRequisitos:**
```tsx
{itens.map(item => (
  <div key={item.id} className={item.atendido ? styles.ok : styles.falha}>
    <span>{item.atendido ? '✅' : '❌'}</span>
    <span>{item.descricao}</span>
    {!item.atendido && item.detalhe && (
      <span className={styles.detalhe}>{item.detalhe}</span>
    )}
  </div>
))}
```

**CaptacaoDetailPage — estado FECHADA:**
```tsx
const isFechada = captacao.status === 'FECHADA';

// Header:
{isOwner && captacao.status === 'ABERTA' && (
  <FecharRolButton onClick={() => setShowFecharModal(true)} />
)}
{isFechada && <Badge variant="success">FECHADA</Badge>}

// ExecucoesSection + UploadsSection: isOwner passa false se FECHADA
<ExecucoesSection ... isOwner={isOwner && !isFechada} />
<UploadsSection ... isOwner={isOwner && !isFechada} />
```

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd frontend && npm run build`
- [x] TypeScript: `cd frontend && npx tsc --noEmit`
- [x] Checklist exibe ✅/❌ corretamente
- [x] Botão desabilitado se algum pré-requisito ❌
- [x] Fechamento → toast + status FECHADA + botões ocultos
- [x] Itens condicionais (classificação, horários) só aparecem para audiovisual
