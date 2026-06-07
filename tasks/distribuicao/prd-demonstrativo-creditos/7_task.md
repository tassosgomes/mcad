---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0"]
---

<task_context>
<domain>frontend/distribuicao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks></unblocks>
</task_context>

# Tarefa 7.0: Frontend — componentes React + integracao em ProcessoDetailPage

## Visao Geral

Implementa a aba "Demonstrativos" na `ProcessoDetailPage`, incluindo a tabela de titulares, o painel de detalhe do demonstrativo com as quatro secoes, e os cards de resumo financeiro. Reutiliza o padrao de tabela, paginacao e badges ja existentes na feature de processos.

## Requisitos

- Nova aba "Demonstrativos" em `ProcessoDetailPage.tsx` (adicionar `'demonstrativos'` ao tipo `ActiveTab`)
- Tabela de titulares com colunas: nome, total a receber, total retido, total liberado, qtde obras (RF-16)
- Campo de busca por nome, exibido apenas quando houver 5 ou mais titulares (RF-17, PRD)
- Ao selecionar titular: exibir demonstrativo detalhado (RF-18) — usar drawer ou secao expandida
- Cards de resumo: `totalAReceber` em destaque, `totalRetido` em amarelo, `totalLiberado` em verde (RF-19)
- Se processo nao for `FINALIZADO`: aviso e funcionalidade desabilitada (RF-20)
- Secao 2 (retidos): badge do motivo de retencao (RF-21)
- Secao 3 (liberados): processoOrigemId como link para detalhe do processo de origem (RF-22)
- Secao 4: estado vazio com mensagem "Nenhum ajuste por estorno neste processo" (RF-23)
- Gate de UI via `<Can permission="distribuicao:default:demonstrativo:listar">` (ADR 0004)
- Valores monetarios formatados como `R$ 1.234,56` (pt-BR)
- Percentuais com 4 casas decimais: `66,6700%`
- Secoes com zero linhas exibidas com estado vazio descritivo (nao ocultas)

## Subtarefas

- [ ] 7.1 Adicionar `'demonstrativos'` ao tipo `ActiveTab` em `ProcessoDetailPage.tsx`
- [ ] 7.2 Criar componente `DemonstrativosTab` em `features/distribuicao/demonstrativos/components/`
  - Gerencia estado de titular selecionado
  - Exibe aviso quando processo nao e FINALIZADO
  - Renderiza `TitularesDemonstrativoTable` e `DemonstrativoTitularPanel`
- [ ] 7.3 Criar `TitularesDemonstrativoTable` com paginacao e busca por nome
- [ ] 7.4 Criar `ResumoFinanceiroCards` (3 cards: totalAReceber, totalRetido, totalLiberado)
- [ ] 7.5 Criar `CreditosCalculadosSection` (Secao 1 — tabela de creditos CALCULADO)
- [ ] 7.6 Criar `CreditosRetidosSection` (Secao 2 — tabela com badge de motivoRetencao)
- [ ] 7.7 Criar `CreditosLiberadosSection` (Secao 3 — tabela com link para processo de origem)
- [ ] 7.8 Criar `AjustesEstornoSection` (Secao 4 — estado vazio informativo)
- [ ] 7.9 Criar `DemonstrativoTitularPanel` que combina resumo + 4 secoes
- [ ] 7.10 Integrar `DemonstrativosTab` em `ProcessoDetailPage.tsx` com gate `<Can>`
- [ ] 7.11 Adicionar utilitario de formatacao monetaria pt-BR se nao existir (`formatBRL`, `formatPercentual`)
- [ ] 7.12 Criar CSS modules para os componentes novos

## Sequenciamento

- Bloqueado por: 5.0 (backend rodando para testes manuais), 6.0 (hooks prontos)
- Desbloqueia: nenhuma tarefa de backend; esta e a ultima tarefa
- Paralelizavel: Nao (depende de 6.0; componentes internos podem ser desenvolvidos em paralelo por subtarefa)

## Detalhes de Implementacao

### Estrutura de arquivos

```
frontend/src/features/distribuicao/demonstrativos/
  components/
    DemonstrativosTab.tsx
    DemonstrativosTab.module.css
    TitularesDemonstrativoTable.tsx
    TitularesDemonstrativoTable.module.css
    DemonstrativoTitularPanel.tsx
    DemonstrativoTitularPanel.module.css
    ResumoFinanceiroCards.tsx
    ResumoFinanceiroCards.module.css
    CreditosCalculadosSection.tsx
    CreditosRetidosSection.tsx
    CreditosLiberadosSection.tsx
    AjustesEstornoSection.tsx
    sections.module.css
```

### Integracao em ProcessoDetailPage.tsx

Localizar o tipo `ActiveTab` (provavelmente `type ActiveTab = 'calculo' | 'retencao' | ...`) e adicionar `'demonstrativos'`.

Adicionar no render da aba:
```tsx
<Can permission="distribuicao:default:demonstrativo:listar">
  <Tab value="demonstrativos">Demonstrativos</Tab>
</Can>
```

No painel de conteudo:
```tsx
{activeTab === 'demonstrativos' && (
  <Can permission="distribuicao:default:demonstrativo:listar">
    <DemonstrativosTab processoId={processo.id} statusProcesso={processo.status} />
  </Can>
)}
```

### DemonstrativosTab — logica principal

```tsx
export function DemonstrativosTab({ processoId, statusProcesso }: Props) {
  const [titularSelecionado, setTitularSelecionado] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [page, setPage] = useState(0);

  const { data: listagem } = useListarTitularesDemonstrativo(processoId, {
    titularNome: filtroNome || undefined,
    page,
    size: 20,
  });

  const { data: demonstrativo } = useConsultarDemonstrativoTitular(
    processoId, titularSelecionado);

  if (statusProcesso !== 'FINALIZADO') {
    return <Alert>O demonstrativo estara disponivel apos a finalizacao do processo</Alert>;
  }

  return (
    <div>
      <TitularesDemonstrativoTable
        data={listagem}
        filtroNome={filtroNome}
        onFiltroNomeChange={setFiltroNome}
        onTitularClick={setTitularSelecionado}
        page={page}
        onPageChange={setPage}
      />
      {titularSelecionado && demonstrativo && (
        <DemonstrativoTitularPanel demonstrativo={demonstrativo} />
      )}
    </div>
  );
}
```

### Formatacao monetaria

Se `formatBRL` nao existir em `src/shared/utils/`, criar:

```typescript
export const formatBRL = (value: string): string => {
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercentualBR = (value: string): string => {
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%';
};
```

### Badges de motivoRetencao (Secao 2)

Mapear o valor da string para label legivel:

```typescript
const MOTIVO_LABEL: Record<string, string> = {
  'OBRA_PENDENTE': 'Obra pendente',
  'OBRA_BLOQUEADA': 'Obra bloqueada',
  'TITULAR_SEM_ASSOCIACAO': 'Titular sem associacao',
};
```

### Campo de busca — regra dos 5 titulares

Exibir o campo de busca apenas quando `listagem?.metadata.totalElements >= 5`. Quando oculto, o filtro ainda deve funcionar se ja tiver sido preenchido.

## Criterios de Sucesso

- Aba "Demonstrativos" aparece em processos FINALIZADOS e e ocultada para usuarios sem a permissao
- Processo nao FINALIZADO exibe aviso descritivo (sem tabela de titulares)
- Campo de busca aparece apenas quando ha 5 ou mais titulares
- Secao 4 sempre exibe estado vazio com mensagem informativa
- Valores monetarios formatados em pt-BR (`R$ 1.234,56`)
- `npm run build` compila sem erros
- Testado manualmente: selecionar titular exibe as 4 secoes do demonstrativo
