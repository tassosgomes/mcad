---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>frontend/identificacao/captacoes</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 4.0: F1 Frontend — Combo de Responsável no filtro

## Visão Geral

Substitui o campo de texto livre "Responsável (ID)" (que exige colar um UUID) por uma combo `<Select>` de analistas por nome, alimentada por um hook cacheado `useAnalistas`. O `value` enviado ao backend continua sendo o mesmo `Guid` que o filtro `?analistaResponsavelId=` já aceita — portanto **nenhuma mudança no GET /captacoes**.

**Espelha exatamente o padrão `useRubricas`/`getRubricas`** e o `<Select>` já usado para Rubrica e Status na mesma tela.

## Requisitos

- Nova função `getAnalistas()` em `captacoesApi.ts` chamando `apiGetIden<AnalistaResumo[]>('/analistas')`.
- Novo hook `useAnalistas` com cache (espelhar `useRubricas`).
- Em `CaptacaoFilters.tsx`: remover `TextInput` + `useDebounce` do campo "Responsável (ID)"; substituir por `<Select>` com opção "Todos" (`value: ''`) + analistas mapeados para `{value: a.id, label: a.nome}`.
- Rótulo passa de "Responsável (ID)" para **"Responsável"**.
- Estados de carregamento/vazio (combo desabilitada + mensagem) sem quebrar a tela.
- Tipo `AnalistaResumo` (`{ id: string; nome: string }`) — já existe em `types/captacao.ts`; reutilizar.

## Subtarefas

- [ ] 4.1 Em `frontend/src/features/identificacao/captacoes/api/captacoesApi.ts`, adicionar:
  ```ts
  export function getAnalistas(): Promise<AnalistaResumo[]> {
    return apiGetIden<AnalistaResumo[]>('/analistas');
  }
  ```
  (confirmar import de `AnalistaResumo` de `../types/captacao`).
- [ ] 4.2 Criar `frontend/src/features/identificacao/captacoes/hooks/useAnalistas.ts` espelhando `useRubricas`:
  ```ts
  export function useAnalistas() {
    return useQuery({
      queryKey: ['analistas'],
      queryFn: getAnalistas,
      staleTime: Infinity,   // decisão do usuário: carga única cacheada (igual useRubricas)
      gcTime: 1000 * 60 * 60,
    });
  }
  ```
  > Nota: a Tech Spec fixa `staleTime: Infinity, gcTime: 1h` (igual `useRubricas`) por decisão do usuário. Manter salvo nova diretriz.
- [ ] 4.3 Em `CaptacaoFilters.tsx`:
  - importar `useAnalistas`;
  - remover `responsavelDraft`/`setResponsavelDraft`/`useDebounce(responsavelDraft, 300)` e o `useEffect` do debounce (não há mais digitação);
  - montar `analistaOptions = analistas?.map(a => ({ value: a.id, label: a.nome })) ?? []`;
  - trocar o `<FormField label="Responsável (ID)">` + `<TextInput>` por:
    ```tsx
    <FormField label="Responsável">
      <Select
        value={filtros.analistaResponsavelId || ''}
        onChange={(val) => handleChange('analistaResponsavelId', val)}
        disabled={isLoadingAnalistas}
        options={[{ value: '', label: 'Todos' }, ...analistaOptions]}
      />
    </FormField>
    ```
  - Estado vazio: quando `analistas` é vazio (não undefined), exibir combo desabilitada com mensagem "Sem analistas disponíveis" (ou `placeholder`) — sem quebrar a tela.
- [ ] 4.4 Remover imports não mais usados (`TextInput`, `useDebounce`) do arquivo.
- [ ] 4.5 Garantir acessibilidade: `<FormField>` já associa rótulo; `<Select>` é navegável por teclado por padrão (componente base do projeto). Validar foco/contraste conforme os demais seletores da tela.
- [ ] 4.6 `npm run build` (type-check + build) verde no frontend.

## Sequenciamento

- Bloqueado por: 3.0 (endpoint `GET /analistas`).
- Desbloqueia: (nenhuma tarefa de código; habilita validação E2E em 7.0).
- Paralelizável: **Não** com 3.0 (depende do contrato). Pode ser desenvolvida contra um mock/contrato definido antes do 3.0 estar em produção, mas a validação real exige o endpoint.

## Detalhes de Implementação

**`handleChange` já existe** no componente (usado por Rubrica/Status): provavelmente faz `onChange({ ...filtros, [campo]: val || undefined, page: 1 })`. Confirmar que passa `undefined` quando `val === ''` ("Todos") para limpar o filtro —行为 já exigido pela RF-5 ("Todos" remove o filtro).

**Componente `Select`** (`@components/ui/select`) é genérico `<T extends string>`; o `value` é `string` (UUID), compatível. Já usado para Rubrica/Status no mesmo arquivo.

**Aliases** (`vite.config.ts`/`tsconfig.json`): `@components` → `src/shared/components/*`, `@hooks` → `src/shared/hooks/*`, `@services` → `src/shared/services/*`.

## Critérios de Sucesso

- O filtro "Responsável" é uma combo por nome (não mais texto livre UUID).
- Selecionar "Todos" remove o filtro; selecionar um analista filtra a listagem.
- Combo lista apenas analistas ativos, ordenados por nome (dados do backend).
- Estado vazio/carregando não quebra a UI.
- Rótulo é "Responsável" (sem "ID").
- `npm run build` verde (sem erros de tipo/lint).
