---
status: pending
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

Criar CancelarRolButton (com verificação prévia), CancelarRolModal (justificativa + radio buttons), CancelamentoBanner, e integrar na CaptacaoDetailPage. Task final do domínio de Identificação.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/components/CancelarRolButton.tsx`
  - `frontend/src/features/identificacao/captacoes/components/CancelarRolModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/CancelamentoBanner.tsx` + `.module.css`
- **Modificar:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` (botão + modal + banner)
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/FecharRolModal.tsx` (padrão modal F05)

## Subtarefas

- [ ] 7.1 Criar `CancelarRolButton` — consulta usePodeCancelar, desabilitado se não pode (tooltip com motivo)
- [ ] 7.2 Criar `CancelarRolModal` + CSS — textarea justificativa (min 10 chars) + 3 radio buttons com descrição + botão danger. Default: COPIAR_EXECUCOES
- [ ] 7.3 Criar `CancelamentoBanner` + CSS — banner vermelho claro com justificativa e data para captações CANCELADAS
- [ ] 7.4 Integrar na CaptacaoDetailPage:
  - FECHADA + dono + não processada → CancelarRolButton visível
  - CANCELADA → CancelamentoBanner no topo
  - Pós-cancelamento → navegação condicional (nova captação ou listagem)
- [ ] 7.5 Teste end-to-end manual:
  - Captação FECHADA não processada → botão "Cancelar Rol" visível
  - Captação processada → botão desabilitado com tooltip
  - Cancelar com COPIAR_EXECUCOES → navega para nova captação
  - Cancelar com APENAS_CANCELAR → navega para listagem
  - Cancelar com RECRIAR_VAZIA → navega para nova captação vazia
  - Captação CANCELADA → banner com justificativa
  - Justificativa < 10 chars → validação client-side

## Sequenciamento

- Bloqueado por: 4.0 (backend), 5.0 (mockups), 6.0 (hooks)
- Desbloqueia: Nenhum (task final do domínio inteiro!)
- Paralelizável: Não

## Detalhes de Implementação

**CancelarRolButton:**
```tsx
const { data: podeCancelar } = usePodeCancelar(captacaoId, captacao.status === 'FECHADA');

<Button
  variant="danger"
  onClick={onClick}
  disabled={!podeCancelar?.podeCancelar}
  title={podeCancelar?.motivo ?? undefined}
>
  Cancelar Rol
</Button>
```

**CancelarRolModal — radio buttons:**
```tsx
<div className={styles.opcoes}>
  <label className={styles.opcao}>
    <input type="radio" name="opcao" value="COPIAR_EXECUCOES"
      checked={opcao === 'COPIAR_EXECUCOES'} onChange={() => setOpcao('COPIAR_EXECUCOES')} />
    <div>
      <strong>Recriar com execuções copiadas</strong>
      <p>Nova captação com todas as execuções (status recalculado)</p>
    </div>
  </label>
  <label className={styles.opcao}>
    <input type="radio" name="opcao" value="RECRIAR_VAZIA"
      checked={opcao === 'RECRIAR_VAZIA'} onChange={() => setOpcao('RECRIAR_VAZIA')} />
    <div>
      <strong>Recriar vazia</strong>
      <p>Nova captação para mesma rubrica+período, sem execuções</p>
    </div>
  </label>
  <label className={styles.opcao}>
    <input type="radio" name="opcao" value="APENAS_CANCELAR"
      checked={opcao === 'APENAS_CANCELAR'} onChange={() => setOpcao('APENAS_CANCELAR')} />
    <div>
      <strong>Apenas cancelar</strong>
      <p>Nenhuma nova captação criada</p>
    </div>
  </label>
</div>
```

**CancelamentoBanner:**
```tsx
<div className={styles.banner}>
  <span className={styles.icon}>❌</span>
  <div>
    <strong>Captação cancelada em {formatDateTime(canceladoEm)}</strong>
    <p>Motivo: {justificativa}</p>
  </div>
</div>
```

**CaptacaoDetailPage — integração completa (F01+F02+F03+F04+F05+F06):**
```tsx
// Header:
{captacao.status === 'ABERTA' && isOwner && <FecharRolButton ... />}
{captacao.status === 'FECHADA' && isOwner && <CancelarRolButton ... />}

// Banner:
{captacao.status === 'CANCELADA' && captacao.justificativaCancelamento && (
  <CancelamentoBanner ... />
)}

// Seções (desabilitadas se FECHADA/CANCELADA):
<ExecucoesSection ... isOwner={isOwner && captacao.status === 'ABERTA'} />
<UploadsSection ... isOwner={isOwner && captacao.status === 'ABERTA'} />
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Botão desabilitado se distribuição processada
- [ ] Radio buttons com descrição legível
- [ ] Justificativa min 10 chars (validação client-side)
- [ ] Toast com contagem de execuções copiadas (opção A)
- [ ] Navegação condicional funciona (nova captação / listagem)
- [ ] Banner vermelho com justificativa para CANCELADA
