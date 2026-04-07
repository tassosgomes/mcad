---
status: pending
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 9.0: Frontend — componentes e page UDA

## Relacionada as User Stories

- [HU-01] Ajustar valor da UDA (cobertura direta — modal de ajuste)
- [HU-02] Consultar historico UDA (cobertura direta — tabela historico)
- [HU-06] Consultar UDA vigente (cobertura direta — card vigente)

## Visao Geral

Implementar os 3 componentes UDA (UdaVigenteCard, UdaHistoricoTable, AjustarUdaModal) e a UdaPage que os compoe. O card exibe o valor vigente com destaque, a tabela mostra o historico completo (sem paginacao), e o modal permite inserir novo valor. Usa `formatBRL` para formatacao e hooks da task 8.0.

## Requisitos

- `UdaVigenteCard`: valor R$ grande, data vigencia, botao "Ajustar Valor" (analista only), alerta se 404
- `UdaHistoricoTable`: colunas Valor, Data Vigencia, Criado Em, Criado Por ("Sistema" se null), destaque na vigente
- `AjustarUdaModal`: campo valor (>0), campo dataVigencia (date), botao Salvar, toast + close + refresh no sucesso
- `UdaPage`: PageHeader + UdaVigenteCard + UdaHistoricoTable, abre AjustarUdaModal
- CSS Modules para cada componente

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/uda/components/UdaVigenteCard.tsx`
  - `frontend/src/features/arrecadacao/uda/components/UdaVigenteCard.module.css`
  - `frontend/src/features/arrecadacao/uda/components/UdaHistoricoTable.tsx`
  - `frontend/src/features/arrecadacao/uda/components/UdaHistoricoTable.module.css`
  - `frontend/src/features/arrecadacao/uda/components/AjustarUdaModal.tsx`
  - `frontend/src/features/arrecadacao/uda/components/AjustarUdaModal.module.css`
  - `frontend/src/features/arrecadacao/uda/pages/UdaPage.tsx`
  - `frontend/src/features/arrecadacao/uda/pages/UdaPage.module.css`
- **Referencia:**
  - `frontend/src/features/arrecadacao/uda/hooks/useUdaVigente.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useHistoricoUda.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useAjustarUda.ts`
  - `frontend/src/features/arrecadacao/shared/utils/formatCurrency.ts`
  - `frontend/src/shared/components/ui/modal/` (modal generico)
  - `frontend/src/shared/components/ui/table/` (table generico)
  - `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` (padrao badge)
- **Skills para consultar durante implementacao:**
  - `react-architecture` — feature modules, pages/components split
  - `react-code-quality` — CSS Modules, typed props, component structure

## Subtarefas

- [ ] 9.1 Criar `UdaVigenteCard` com valor formatado, data vigencia, botao analista, alerta 404
- [ ] 9.2 Criar `UdaHistoricoTable` com colunas, destaque vigente, "Sistema" para criadoPor null
- [ ] 9.3 Criar `AjustarUdaModal` com form (valor, dataVigencia), validacao, toast sucesso
- [ ] 9.4 Criar `UdaPage` compondo os 3 componentes
- [ ] 9.5 Criar CSS Modules para cada componente e page

## Sequenciamento

- Bloqueado por: 8.0
- Desbloqueia: 10.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-05
- Evidencia esperada: UdaPage renderiza com card + tabela + modal funcional

## Detalhes de Implementacao

**UdaVigenteCard:**

```tsx
interface UdaVigenteCardProps {
  onAjustar: () => void;
  isAnalista: boolean;
}

export function UdaVigenteCard({ onAjustar, isAnalista }: UdaVigenteCardProps) {
  const { data: uda, isError } = useUdaVigente();

  if (isError) return <Alert variant="warning">Nenhum valor de UDA configurado</Alert>;

  return (
    <Card>
      <div className={styles.valorDestaque}>
        {formatBRL(uda.valor)}
      </div>
      <span>Vigente desde {formatDate(uda.dataVigencia)}</span>
      {isAnalista && <Button onClick={onAjustar}>Ajustar Valor</Button>}
    </Card>
  );
}
```

**UdaHistoricoTable:**

```tsx
// Colunas: Valor (formatBRL), Data Vigencia, Criado Em, Criado Por
// criadoPor null → "Sistema"
// Destaque visual na linha onde uda.dataVigencia = vigente.dataVigencia
```

**AjustarUdaModal:**

```tsx
export function AjustarUdaModal({ isOpen, onClose }: AjustarUdaModalProps) {
  const [valor, setValor] = useState('');
  const [dataVigencia, setDataVigencia] = useState('');
  const mutation = useAjustarUda();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ valor, dataVigencia }, {
      onSuccess: () => { toast.success('Valor da UDA ajustado'); onClose(); },
      onError: (err) => { toast.error(err.message); },
    });
  }
  // Form com campos valor e dataVigencia
}
```

**UdaPage:**

```tsx
export function UdaPage() {
  const [showModal, setShowModal] = useState(false);
  // Composicao: PageHeader + UdaVigenteCard + UdaHistoricoTable + AjustarUdaModal
}
```

**Convencoes da stack:**
- Functional components com typed props (interface)
- CSS Modules para estilos isolados
- Formularios com estado manual (useState)
- Toast para feedback de sucesso/erro
- Componentes < 300 linhas

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] UdaPage renderiza com card + tabela
- [ ] AjustarUdaModal abre, valida e submete
- [ ] formatBRL aplica formatacao correta nos valores
