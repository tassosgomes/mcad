---
status: done
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 5.0: Frontend — types + API + hook + modal + extensao detail page

## Relacionada as User Stories

- [HU-01] Estornar pagamento (cobertura direta — modal de confirmacao)
- [HU-02] Consultar pagamento estornado (cobertura direta — card dados estorno)

## Visao Geral

Estender o modulo frontend de pagamentos (F04) para suportar estorno: adicionar campos de estorno aos types, funcao API, hook useMutation, componente modal de confirmacao e extensao da PagamentoDetailPage com card de dados do estorno e botao ativo (era disabled no F04).

## Requisitos

1. Estender tipo Pagamento com 3 campos nullable (justificativaEstorno, estornadoPor, estornadoEm)
2. Criar tipo EstornarPagamentoRequest
3. Criar funcao API estornarPagamento(id, request)
4. Criar hook useEstornarPagamento (useMutation com invalidacao)
5. Criar EstornarPagamentoModal com textarea justificativa (min 10, max 500, contador), botao destrutivo
6. Estender PagamentoDetailPage: ativar botao Estornar (CONFIRMADO + analista), card Dados do Estorno (ESTORNADO)
7. Tratamento de erros: 422 verba lock → toast, 422 ja estornado → toast

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/pagamentos/hooks/useEstornarPagamento.ts`
  - `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.module.css`
- **Modificar:**
  - `frontend/src/features/arrecadacao/pagamentos/types/pagamento.ts` (3 campos + EstornarPagamentoRequest)
  - `frontend/src/features/arrecadacao/pagamentos/api/pagamentosApi.ts` (funcao estornarPagamento)
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx` (ativar botao + card estorno)
- **Referencia:**
  - `frontend/src/features/arrecadacao/pagamentos/hooks/useRegistrarPagamento.ts` (padrao useMutation)
  - `frontend/src/shared/components/ui/modal/` (modal generico)
  - `frontend/src/features/arrecadacao/shared/utils/formatCurrency.ts` (formatBRL)
  - `frontend/src/shared/services/apiArrecadacaoClient.ts` (apiPostArr)

## Subtarefas

- [X] 5.1 Estender tipo Pagamento com campos nullable + criar EstornarPagamentoRequest
- [X] 5.2 Adicionar funcao `estornarPagamento(id, request)` em pagamentosApi.ts
- [X] 5.3 Criar hook `useEstornarPagamento` com invalidacao de queries
- [X] 5.4 Criar `EstornarPagamentoModal` com resumo, textarea, validacao, tratamento de erros
- [X] 5.5 Estender `PagamentoDetailPage`: card dados estorno + botao ativo
- [X] 5.6 Criar CSS Module para modal

## Detalhes de Implementacao

**pagamento.ts — extensao:**

```typescript
export interface Pagamento {
  // ... campos existentes F04
  id: string;
  licenca: LicencaResumo;
  quantidadeUdas: string;
  valorUdaNoMomento: string;
  valorBruto: string;
  periodo: string;
  status: StatusPagamento;
  dataRegistro: string;
  criadoEm: string;
  atualizadoEm: string;
  // F06 — campos de estorno (nullable)
  justificativaEstorno: string | null;
  estornadoPor: string | null;
  estornadoEm: string | null;
}

export interface EstornarPagamentoRequest {
  justificativa: string;
}
```

**pagamentosApi.ts — nova funcao:**

```typescript
export async function estornarPagamento(
  id: string, data: EstornarPagamentoRequest
): Promise<Pagamento> {
  return apiPostArr<Pagamento>(`/pagamentos/${id}/estornar`, data);
}
```

**useEstornarPagamento hook:**

```typescript
export function useEstornarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstornarPagamentoRequest }) =>
      estornarPagamento(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos', id] });
    },
  });
}
```

**EstornarPagamentoModal:**

```tsx
interface EstornarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagamento: Pagamento;
}

export function EstornarPagamentoModal({ isOpen, onClose, pagamento }: EstornarPagamentoModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const mutation = useEstornarPagamento();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ id: pagamento.id, data: { justificativa } }, {
      onSuccess: () => { toast.success('Pagamento estornado com sucesso'); onClose(); },
      onError: (err) => { toast.error(err.message); },
    });
  }

  const isValid = justificativa.length >= 10 && justificativa.length <= 500;

  return (
    <Modal isOpen={isOpen} onClose={title="Estornar Pagamento">
      {/* Resumo: licenca, periodo, valorBruto formatado */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Justificativa do estorno (min. 10 caracteres)"
          maxLength={500}
        />
        <span>{justificativa.length}/500</span>
        <Button type="submit" variant="destructive" disabled={!isValid || mutation.isPending}>
          Confirmar Estorno
        </Button>
      </form>
    </Modal>
  );
}
```

**PagamentoDetailPage — extensao:**

```tsx
// Card dados do estorno (quando ESTORNADO)
{pagamento.status === 'ESTORNADO' && pagamento.justificativaEstorno && (
  <Card title="Dados do Estorno">
    <Field label="Justificativa">{pagamento.justificativaEstorno}</Field>
    <Field label="Estornado por">{pagamento.estornadoPor}</Field>
    <Field label="Data do estorno">{formatDateTime(pagamento.estornadoEm)}</Field>
  </Card>
)}

// Botao estornar (quando CONFIRMADO + analista)
{pagamento.status === 'CONFIRMADO' && isAnalista && (
  <Button variant="destructive" onClick={() => setShowModal(true)}>
    Estornar
  </Button>
)}

// Modal
<EstornarPagamentoModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  pagamento={pagamento}
/>
```

**Convencoes da stack:**
- TypeScript strict, sem `any`
- CSS Modules para estilos isolados
- Formularios com estado manual (useState)
- useMutation com invalidacao de queries
- Toast para feedback sucesso/erro
- Componentes < 300 linhas

## Testes

- [X] Build compila sem erros TypeScript
- [X] Modal abre ao clicar "Estornar" (CONFIRMADO + analista)
- [X] Modal nao aparece para consultor
- [X] Card "Dados do Estorno" aparece quando ESTORNADO
- [X] Validacao client-side: botao disabled com < 10 chars
- [X] Contador de caracteres exibe corretamente

## Criterios de Sucesso

- [X] Build compila: `cd frontend && npm run build`
- [X] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [X] Modal submete estorno e recarrega pagina com status ESTORNADO
- [X] Card dados estorno exibe justificativa, autor e data formatada
- [X] Tratamento de erros: 422 exibe toast contextual
