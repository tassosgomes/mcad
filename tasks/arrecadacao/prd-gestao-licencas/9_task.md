---
status: done
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 9.0: Componentes

## Relacionada as User Stories
- [HU-01] Criar licenca (cobertura direta — LicencaForm)
- [HU-02] Listar licencas com filtros (cobertura direta — LicencasTable, LicencasFilters)
- [HU-03] Visualizar detalhe de licenca (cobertura direta — StatusBadgeLicenca, HistoricoStatusTimeline)
- [HU-04] Suspender licenca (cobertura direta — AlterarStatusModal)
- [HU-05] Reativar licenca (cobertura direta — AlterarStatusModal)
- [HU-06] Encerrar licenca (cobertura direta — AlterarStatusModal)

## Visao Geral

Implementa os 6 componentes reutilizaveis do modulo de Licencas com seus respectivos CSS Modules: badge de status, tabela, filtros com debounce, formulario de criacao com autocomplete, modal generico de transicao de status e timeline de historico. Cada componente segue os padroes visuais e estruturais dos componentes de `src/features/cadastro/titulares/components/`.

## Requisitos

- `StatusBadgeLicenca`: badge visual com cor por status (verde ATIVA, amarelo SUSPENSA, cinza ENCERRADA), reutilizando o componente `Badge` do shared/ui
- `LicencasTable`: colunas Usuario (razaoSocial), Rubrica (sigla + nome), Data Inicio, Data Fim ("Indefinida" se null), Status (StatusBadgeLicenca), Acoes (link para detalhes)
- `LicencasFilters`: 5 filtros — TextInput razaoSocial com debounce 300ms, Select rubricaSigla (7 opcoes), Select status (Todos/ATIVA/SUSPENSA/ENCERRADA), Select vigente (Todos/Vigentes/Expiradas), botao Reset; usar `useDebounce` do shared/hooks
- `LicencaForm`: Autocomplete de Usuario de Musica (busca server-side por razao social, apenas ATIVOS, debounce 300ms, size=10), Select de Rubrica (7 opcoes fixas), date picker Data Inicio (min=hoje), date picker Data Fim opcional (min=dataInicio+1 dia); validacao client-side; erros 422 via toast
- `AlterarStatusModal`: props `acao` ('suspender'|'reativar'|'encerrar'), `licencaId`, `onSuccess`, `onClose`; textarea justificativa (min 10 chars, validacao client-side); para "encerrar" adicionar aviso visual vermelho + checkbox "Entendo que esta acao e irreversivel"; botao com cor contextual (amarelo suspender, verde reativar, vermelho encerrar)
- `HistoricoStatusTimeline`: lista ordenada do mais recente ao mais antigo; cada entrada exibe data/hora formatada, badge statusNovo, seta statusAnterior→statusNovo, autor e justificativa
- Todos os componentes com CSS Module correspondente

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.module.css`
  - `frontend/src/features/arrecadacao/licencas/components/LicencasTable.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/LicencasTable.module.css`
  - `frontend/src/features/arrecadacao/licencas/components/LicencasFilters.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/LicencasFilters.module.css`
  - `frontend/src/features/arrecadacao/licencas/components/LicencaForm.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/LicencaForm.module.css`
  - `frontend/src/features/arrecadacao/licencas/components/AlterarStatusModal.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/AlterarStatusModal.module.css`
  - `frontend/src/features/arrecadacao/licencas/components/HistoricoStatusTimeline.tsx`
  - `frontend/src/features/arrecadacao/licencas/components/HistoricoStatusTimeline.module.css`
- **Modificar:** Nenhum
- **Referencia:**
  - `frontend/src/shared/components/ui/badge/` — base para StatusBadgeLicenca
  - `frontend/src/shared/components/ui/table/` — Table generico reutilizado em LicencasTable
  - `frontend/src/shared/components/ui/modal/` — Modal generico reutilizado em AlterarStatusModal
  - `frontend/src/shared/components/ui/pagination/` — Pagination reutilizado
  - `frontend/src/shared/components/ui/autocomplete/` — Autocomplete para selecao de Usuario em LicencaForm
  - `frontend/src/shared/hooks/useDebounce.ts` — debounce nos filtros e autocomplete
  - `frontend/src/shared/components/ui/toast/` — toast para feedback de erros
  - `frontend/src/features/cadastro/titulares/components/TitularesFilters.tsx` — padrao de filtros com debounce
  - `frontend/src/features/cadastro/titulares/components/TitularForm.tsx` — padrao de formulario com useState
  - `frontend/src/features/cadastro/titulares/components/DeleteTitularModal.tsx` — padrao de modal com confirmacao

## Subtarefas

- [x] 9.1 Criar `StatusBadgeLicenca.tsx` e CSS Module (cores por status)
- [x] 9.2 Criar `LicencasTable.tsx` e CSS Module (6 colunas + link detalhes)
- [x] 9.3 Criar `LicencasFilters.tsx` e CSS Module (5 filtros com debounce e reset)
- [x] 9.4 Criar `LicencaForm.tsx` e CSS Module (autocomplete + select + date pickers + validacao)
- [x] 9.5 Criar `AlterarStatusModal.tsx` e CSS Module (modal generico + checkbox encerrar)
- [x] 9.6 Criar `HistoricoStatusTimeline.tsx` e CSS Module (timeline ordenada desc)

## Sequenciamento

- Bloqueado por: 8.0
- Desbloqueia: 10.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 (camada de componentes UI)
- Evidencia esperada: componentes renderizam sem erro; badge exibe cor correta por status; modal de encerrar exibe checkbox de confirmacao

## Detalhes de Implementacao

**StatusBadgeLicenca — mapeamento de cores:**

```typescript
// Usa variaveis CSS do projeto:
// ATIVA    → --color-status-success  (verde)
// SUSPENSA → --color-status-warning  (amarelo)
// ENCERRADA → --color-text-muted     (cinza)

interface StatusBadgeLicencaProps {
  status: StatusLicenca;
}
```

**LicencasTable — colunas:**

| Coluna | Valor |
|--------|-------|
| Usuario | `licenca.usuarioMusica.razaoSocial` |
| Rubrica | `licenca.rubrica.sigla — licenca.rubrica.nome` |
| Data Inicio | `licenca.dataInicio` formatada |
| Data Fim | `licenca.dataFim` formatada ou "Indefinida" se null |
| Status | `<StatusBadgeLicenca status={licenca.status} />` |
| Acoes | Link `<a href={/arrecadacao/licencas/${licenca.id}}>Detalhes</a>` |

**LicencasFilters — props e estado:**

```typescript
interface LicencasFiltersProps {
  filtros: LicencaFiltros;
  onChange: (filtros: Partial<LicencaFiltros>) => void;
  onReset: () => void;
}
// razaoSocial: TextInput com useDebounce(300)
// rubricaSigla: Select com opcoes ['', 'RADIO', 'TV_ABERTA', 'TV_FECHADA', 'INTERNET', 'SHOWS', 'SONORIZACAO', 'OUTROS']
// status: Select com opcoes ['', 'ATIVA', 'SUSPENSA', 'ENCERRADA']
// vigente: Select com opcoes ['', 'true', 'false'] mapeando para boolean|undefined
// Botao Reset chama onReset()
```

**LicencaForm — estado e validacao:**

```typescript
// Estado manual com useState (padrao do projeto, nao React Hook Form)
// Campos: usuarioMusicaId (string), rubricaId (string), dataInicio (string), dataFim (string)
// Autocomplete de Usuario: busca GET /usuarios-musica?razaoSocial=...&status=ATIVO&size=10
// Validacao antes do submit:
//   - dataInicio >= hoje
//   - dataFim > dataInicio (se preenchida)
// Erros 422 do backend exibidos via toast (ex: "Usuario INATIVO nao pode receber licenca")
```

**AlterarStatusModal — props e comportamento:**

```typescript
interface AlterarStatusModalProps {
  acao: 'suspender' | 'reativar' | 'encerrar';
  licencaId: string;
  onSuccess: () => void;
  onClose: () => void;
}
// Titulo: "Suspender Licenca" | "Reativar Licenca" | "Encerrar Licenca"
// Textarea justificativa: minLength=10, mensagem de erro se < 10 chars
// Para acao='encerrar':
//   - Texto vermelho: "Esta acao e irreversivel. A licenca nao podera ser reativada."
//   - Checkbox: "Entendo que esta acao e irreversivel" (obrigatorio para habilitar botao)
// Botao confirmar desabilitado enquanto mutation.isPending
// Cores do botao: suspender=warning, reativar=success, encerrar=danger
```

**HistoricoStatusTimeline — estrutura de cada entrada:**

```typescript
// Ordenado por data DESC (mais recente primeiro)
// Para cada HistoricoStatusLicenca:
//   - Data/hora formatada (ex: "05/04/2026 14:32")
//   - StatusAnterior → StatusNovo (com badges)
//   - Autor
//   - Justificativa
// statusAnterior null na primeira entrada (criacao): exibir "—"
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
