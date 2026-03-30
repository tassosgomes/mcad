---
status: pending
parallelizable: false
blocked_by: ["11.0", "12.0", "13.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"15.0"</unblocks>
</task_context>

# Tarefa 14.0: Feature — Componentes (Table, Filters, Form, DeleteModal)

## Relacionada às User Stories

- [HU-01/02] Cadastrar (TitularForm)
- [HU-03] Buscar (TitularesTable + TitularesFilters)
- [HU-04] Editar (TitularForm modo edição)

## Visão Geral

Criar os 4 componentes específicos da feature Titulares, usando os shared components criados nas tasks 11 e 12: tabela com sort clicável e badges, filtros com debounce, formulário compartilhado (criar/editar) com validação inline CPF/CNPJ, e modal de confirmação de exclusão.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/titulares/components/TitularesTable.tsx` + `.module.css`
  - `frontend/src/features/cadastro/titulares/components/TitularesFilters.tsx` + `.module.css`
  - `frontend/src/features/cadastro/titulares/components/TitularForm.tsx` + `.module.css`
  - `frontend/src/features/cadastro/titulares/components/DeleteTitularModal.tsx` + `.module.css`
- **Referência:**
  - `frontend/DESIGN.md` — tokens, princípios, componentes
  - `tasks/prd-gestao-titulares/techspec-frontend.md` — seções componentes
  - Stitch screens (task 9.0) — referência visual pixel-perfect
  - `frontend/src/features/cadastro/associacoes/components/AssociacoesTable.tsx` — padrão
- **Skills:** `react-architecture`; `frontend-design`

## Subtarefas

- [ ] 14.1 **TitularesTable** — usa Table genérico com colunas: Nome, Tipo (Badge PF/PJ), Documento (mono, formatado), Associação (sigla), Status (Badge), Ações (botões editar/excluir ghost). Headers clicáveis para sort (seta ▲▼ indicando direção).
- [ ] 14.2 **TitularesFilters** — layout grid: TextInput nome (debounce 300ms), TextInput documento (debounce 300ms, mono), Select associação (useAssociacoes de F01!), Select status (ATIVO/FALECIDO/TRANSFERINDO). Reset automático de page=1 ao mudar filtro.
- [ ] 14.3 **TitularForm** — props: initialData (undefined=criar, preenchido=editar), onSubmit, isSubmitting. Toggle tipo PF/PJ alterna campo CPF↔CNPJ. Validação inline: CPF/CNPJ ao perder foco (blur). Campos tipo/documento disabled se modo edição. Dropdown associação (useAssociacoes). Select status visível apenas em edição.
- [ ] 14.4 **DeleteTitularModal** — usa Modal genérico. Props: titular (nome para exibir), isOpen, onClose, onConfirm, isDeleting. Botões Cancelar (secondary) e Excluir (danger).
- [ ] 14.5 Verificar: `npm run build`

## Detalhes de Implementação

### TitularesTable — sort clicável
```typescript
interface TitularesTableProps {
  data: Titular[];
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (id: string) => void;
  onDelete: (titular: Titular) => void;
}
// Click no header: se sort="nome" → sort="-nome" (toggle)
```

### TitularForm — validação inline
```typescript
const [documentError, setDocumentError] = useState<string>();

function handleDocumentBlur() {
  if (tipo === 'PF' && !isValidCpf(documento)) setDocumentError('CPF inválido');
  else if (tipo === 'PJ' && !isValidCnpj(documento)) setDocumentError('CNPJ inválido');
  else setDocumentError(undefined);
}
```

### TitularesFilters — reutiliza useAssociacoes de F01
```typescript
import { useAssociacoes } from '../../associacoes/hooks/useAssociacoes';
// Gera options para Select de associação
```

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] TitularesTable exibe badges de tipo e status com cores corretas
- [ ] Click no header de coluna alterna sort ASC/DESC
- [ ] CPF/CNPJ exibido em JetBrains Mono
- [ ] TitularesFilters atualiza com debounce de 300ms
- [ ] TitularForm valida CPF/CNPJ inline ao perder foco
- [ ] TitularForm em modo edição tem tipo/documento disabled
- [ ] DeleteTitularModal exibe nome do titular
