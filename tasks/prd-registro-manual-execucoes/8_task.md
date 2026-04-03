---
status: completed
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

- RF-01 — BuscaCadastroAutocomplete
- RF-02, RF-05 — ExecucaoFormModal
- RF-03 — CriarObraPendenteModal, CriarFonogramaPendenteModal
- RF-04 — ExecucoesTable, ExecucoesSection
- RF-06 — DeleteExecucaoModal
- RF-07 — Campos condicionais no ExecucaoFormModal
- RF-08 — Cálculo de duração live no ExecucaoFormModal

## Visão Geral

Implementar 7 componentes com CSS Modules seguindo mockups do Stitch. O `BuscaCadastroAutocomplete` é o mais complexo — autocomplete com debounce, resultados tipados e fallback para criação inline.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/ExecucaoFormModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/BuscaCadastroAutocomplete.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/CriarObraPendenteModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/CriarFonogramaPendenteModal.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/DeleteExecucaoModal.tsx` + `.module.css`
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.tsx` (padrão de tabela)
  - `frontend/src/features/identificacao/captacoes/components/DeleteCaptacaoModal.tsx` (padrão de modal delete)
  - `frontend/src/shared/components/ui/modal/Modal.tsx`
  - `frontend/src/shared/components/ui/badge/Badge.tsx`

## Subtarefas

- [x] 8.1 Criar `BuscaCadastroAutocomplete` + CSS — autocomplete com debounce, resultados tipados (🎵fonograma / 📝obra), ISRC/ISWC + badges, footer "Criar pendente", valor selecionado com botão limpar
- [x] 8.2 Criar `CriarObraPendenteModal` + CSS — título + tipo obra (Select), chama useCreateObraPendente, retorna ObraFonogramaSelecionado
- [x] 8.3 Criar `CriarFonogramaPendenteModal` + CSS — ISRC opcional + obra read-only, chama useCreateFonogramaPendente
- [x] 8.4 Criar `ExecucaoFormModal` + CSS — usa BuscaCadastroAutocomplete, inputs time, duração live (useMemo), campos condicionais, validação client-side, tratamento de erros por code
- [x] 8.5 Criar `ExecucoesTable` + CSS — colunas: título+ISRC, intérpretes, início, fim, duração formatada, qtd, tipo (badge), status (badge), ações condicionais
- [x] 8.6 Criar `DeleteExecucaoModal` + CSS — confirmação com título da obra em bold
- [x] 8.7 Criar `ExecucoesSection` + CSS — wrapper que orquestra tabela, modal de formulário, modal de exclusão, paginação, filtro por status

## Sequenciamento

- Bloqueado por: 6.0 (mockups), 7.0 (types + hooks)
- Desbloqueia: 9.0
- Paralelizável: Não

## Detalhes de Implementação

**BuscaCadastroAutocomplete — fluxo:**
```
[Input texto] → debounce 300ms → useBuscaCadastro
                                        ↓
                               [Dropdown resultados]
                               ├── 🎵 Fonograma: Título — ISRC — Intérpretes [LIBERADO]
                               ├── 📝 Obra: Título — ISWC [LIBERADO]
                               └── ──────────────────────────
                                   Não encontrou?
                                   [Criar obra pendente] | [Criar fonograma pendente]
```

Quando seleciona → chama `onChange(ObraFonogramaSelecionado)`, fecha dropdown.
"Criar fonograma pendente" só disponível se já tem obra selecionada (via BuscaCadastroAutocomplete ou CriarObraPendenteModal).

**ExecucaoFormModal — cálculo de duração live:**
```typescript
const duracaoSegundos = useMemo(() => {
  if (!inicio || !fim) return 0;
  const [h1, m1, s1] = inicio.split(':').map(Number);
  const [h2, m2, s2] = fim.split(':').map(Number);
  const totalInicio = h1 * 3600 + m1 * 60 + (s1 || 0);
  const totalFim = h2 * 3600 + m2 * 60 + (s2 || 0);
  return totalFim > totalInicio ? totalFim - totalInicio : 0;
}, [inicio, fim]);

// Exibição
<span>{formatDuracao(duracaoSegundos)}</span>  // "3min 45s"
```

**ExecucaoFormModal — campos condicionais:**
```tsx
{rubrica.exigeClassificacao && (
  <>
    <FormField label="Tipo de Utilização" required error={errors.tipoUtilizacaoId}>
      <Select value={tipoUtilizacaoId} onChange={setTipoUtilizacaoId}
        options={tiposUtilizacao?.map(t => ({ value: t.id, label: `${t.sigla} — ${t.descricao}` })) ?? []}
        placeholder="Selecione" />
    </FormField>
    <FormField label="Título do Programa" required error={errors.tituloPrograma}>
      <TextInput value={tituloPrograma} onChange={setTituloPrograma}
        placeholder="Ex: Novela das 9 - Cap. 142" />
    </FormField>
  </>
)}
```

**ExecucoesTable — formatação:**
```typescript
function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec}s`;
}
```

Badge de status: IDENTIFICADA=`success`, PENDENTE=`warning`.
Coluna título: título em bold + ISRC/ISWC em mono abaixo (2 linhas).

**ExecucoesSection — orquestração de estado:**
```typescript
const [filtros, setFiltros] = useState<ExecucaoFiltros>({ page: 1, size: 20, sort: 'inicio' });
const [execucaoParaEditar, setExecucaoParaEditar] = useState<Execucao | null>(null);
const [execucaoParaExcluir, setExecucaoParaExcluir] = useState<Execucao | null>(null);
const [showFormModal, setShowFormModal] = useState(false);
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [x] Autocomplete busca com debounce e mostra resultados tipados
- [x] Campos condicionais aparecem/desaparecem com base na rubrica
- [x] Duração calculada live ("3min 45s" para 14:30:00→14:33:45)
- [x] Criação de obra/fonograma pendente funciona e preenche o autocomplete
- [x] Componentes seguem mockups do Stitch
