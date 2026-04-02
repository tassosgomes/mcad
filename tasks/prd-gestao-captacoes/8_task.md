---
status: pending
parallelizable: false
blocked_by: [6.0, 7.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>none</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Frontend — Componentes

## Relacionada aos Requisitos

- RF-01 — CaptacaoForm (criação)
- RF-02 — CaptacoesTable, CaptacaoFilters
- RF-04 — CaptacaoForm (edição, rubrica bloqueada)
- RF-05 — DeleteCaptacaoModal

## Visão Geral

Implementar os 4 componentes de domínio (tabela, formulário, filtros, modal de exclusão) com CSS Modules, seguindo os mockups aprovados do Stitch e os padrões do Cadastro.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.tsx`
  - `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.module.css`
  - `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.tsx`
  - `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.module.css`
  - `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.tsx`
  - `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.module.css`
  - `frontend/src/features/identificacao/captacoes/components/DeleteCaptacaoModal.tsx`
  - `frontend/src/features/identificacao/captacoes/components/DeleteCaptacaoModal.module.css`
- **Referência:**
  - `frontend/src/features/cadastro/obras/components/ObrasTable.tsx` (padrão de tabela)
  - `frontend/src/features/cadastro/obras/components/ObraForm.tsx` (padrão de formulário)
  - `frontend/src/shared/components/ui/` (Button, TextInput, Select, FormField, Badge, Modal, Pagination)

## Subtarefas

- [ ] 8.1 Criar `CaptacoesTable.tsx` + CSS — colunas: rubrica (badge), período (dd/MM/yyyy), usuário de música, status (badge), responsável, ações (view, delete condicional)
- [ ] 8.2 Criar `CaptacaoForm.tsx` + CSS — campos: rubrica (Select de useRubricas com indicador classificação), período (input date), usuário de música (TextInput). Rubrica disabled se temExecucoes. Read-only se status !== ABERTA
- [ ] 8.3 Criar `CaptacaoFilters.tsx` + CSS — filtros: rubrica (Select), período início/fim (date), status (Select), responsável (TextInput com debounce 300ms). Reset page ao filtrar
- [ ] 8.4 Criar `DeleteCaptacaoModal.tsx` + CSS — título, mensagem com rubrica+período em bold, aviso de execuções se totalExecucoes > 0, botões Cancelar + Excluir (danger)

## Sequenciamento

- Bloqueado por: 6.0 (mockups aprovados), 7.0 (types e hooks)
- Desbloqueia: 9.0
- Paralelizável: Não

## Detalhes de Implementação

**CaptacoesTable — props e colunas:**
```typescript
interface CaptacoesTableProps {
  data: Captacao[];
  canWrite: boolean;
  currentUserId: string;
  sort: string;
  onSortChange: (sort: string) => void;
  onView: (id: string) => void;
  onDelete: (captacao: Captacao) => void;
}
```

Colunas sortáveis: Rubrica (`rubrica`), Período (`periodo`). Demais não sortáveis.

Badge de status:
- ABERTA → `accent`
- FECHADA → `success`
- CANCELADA → `muted`

Badge de rubrica:
- Audiovisuais (TV Aberta, TV Fechada, Cinema, VOD) → `accent`
- Áudio (Rádio, Streaming Áudio) → `secondary`
- Ao vivo (Show) → `warning`

Ícone de delete: visível somente se `canWrite && captacao.analistaResponsavel.id === currentUserId && captacao.status === 'ABERTA'`.

**CaptacaoForm — indicador de classificação no dropdown:**
```typescript
// No dropdown de rubricas, exibir indicador visual
const rubricaOptions = rubricas?.map(r => ({
  value: r.id,
  label: r.exigeClassificacao ? `${r.nome} ⚡` : r.nome,
})) ?? [];
```

Campo rubrica disabled quando `temExecucoes === true`. Tooltip: "Não é possível alterar a rubrica de uma captação com execuções".

**CaptacaoForm — validação client-side:**
```typescript
function validate(): boolean {
  const newErrors: Record<string, string> = {};
  if (!rubricaId) newErrors.rubricaId = 'Selecione uma rubrica';
  if (!periodo) newErrors.periodo = 'Informe o período (data)';
  if (!usuarioDeMusica.trim()) newErrors.usuarioDeMusica = 'Informe o usuário de música';
  if (usuarioDeMusica.length > 255) newErrors.usuarioDeMusica = 'Máximo 255 caracteres';
  setErrors(newErrors);
  return Object.keys(newErrors).every(k => !newErrors[k]);
}
```

**CaptacaoFilters — debounce no campo responsável:**
```typescript
const [responsavelDraft, setResponsavelDraft] = useState('');
const responsavelDebouncado = useDebounce(responsavelDraft, 300);

useEffect(() => {
  onChange({ ...filtros, analistaResponsavelId: responsavelDebouncado || undefined, page: 1 });
}, [responsavelDebouncado]);
```

**DeleteCaptacaoModal — conteúdo:**
```tsx
<Modal isOpen={isOpen} onClose={onCancel} title="Excluir Captação" actions={
  <>
    <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>Cancelar</Button>
    <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
      {isDeleting ? 'Excluindo...' : 'Excluir'}
    </Button>
  </>
}>
  <p>Tem certeza que deseja excluir a captação de <strong>{captacao.rubrica.nome}</strong> em <strong>{formatDate(captacao.periodo)}</strong>?</p>
  {totalExecucoes > 0 && (
    <p className={styles.warning}>Esta captação possui <strong>{totalExecucoes} execuções</strong> que também serão removidas.</p>
  )}
</Modal>
```

**Convenções CSS:**
- CSS Modules com `.module.css`
- Design tokens: `var(--color-accent)`, `var(--space-6)`, `var(--radius-lg)`
- camelCase nos class names
- Seguir estrutura do `ObrasTable.module.css` como referência

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] Componentes seguem mockups do Stitch
- [ ] CaptacaoForm valida campos obrigatórios antes de submeter
- [ ] Rubrica disabled quando `temExecucoes === true`
- [ ] Badge de status com cores corretas (accent/success/muted)
