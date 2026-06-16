---
status: pending
parallelizable: false
blocked_by: ["4.0", "5.0"]
---

<task_context>
<domain>frontend/features/identificacao/captacoes</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<risk>medium</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>unit</validation_level>
<context_budget>medium</context_budget>
<dependencies>http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Autocomplete no CaptacaoForm, Filtros e Tabela

## Visão Geral

Substitui o `TextInput` de texto livre no `CaptacaoForm` por um componente `Autocomplete` (com debounce) que consulta o endpoint local da Identificação (`GET /api/v1/usuarios-musica`). Adiciona o mesmo Autocomplete como filtro na lista de captações. Atualiza tipos, API client, hooks, tabela e página de detalhe.

Cobre **RF-05** e **RF-06** do PRD. Reaproveita o padrão já existente no `LicencaForm` (módulo Arrecadação).

## Requisitos

- `CaptacaoForm`: campo Usuário de Música vira Autocomplete (debounce 300ms, min 2 chars, onSelect popula `usuarioMusicaId` + `usuarioMusicaNome`, validação obrigatória).
- `CaptacaoFilters`: add Autocomplete para filtrar por `usuarioMusicaId`.
- Tipos (`captacao.ts`), API client (`captacoesApi.ts`), novo hook de busca, tabela e detalhe atualizados.
- Busca consulta **apenas** o endpoint da Identificação (nunca a Arrecadação).

## Subtarefas

- [ ] 7.1 Criar `types/usuario-musica-snapshot.ts` (interface do snapshot)
- [ ] 7.2 Criar `api/usuariosMusicaApi.ts` (`buscarUsuariosMusica(q, cnpj?)` via `apiGetIden`)
- [ ] 7.3 Criar `hooks/useBuscaUsuariosMusica.ts` (TanStack Query + `useDebounce`, min 2 chars)
- [ ] 7.4 Modificar `types/captacao.ts`: `Captacao`/`CriarCaptacaoRequest`/`AtualizarCaptacaoRequest` (`usuarioMusicaId`+`usuarioMusicaNome`); `CaptacaoFiltros` add `usuarioMusicaId`
- [ ] 7.5 Modificar `api/captacoesApi.ts`: param `usuarioMusicaId` em `getCaptacoes`
- [ ] 7.6 Modificar `components/CaptacaoForm.tsx`: `TextInput` → `Autocomplete` (render razão social + CNPJ), validação de seleção obrigatória
- [ ] 7.7 Modificar `components/CaptacaoFilters.tsx`: add Autocomplete de filtro por usuário
- [ ] 7.8 Modificar `components/CaptacoesTable.tsx`: exibir `usuarioMusicaNome`
- [ ] 7.9 Modificar `pages/CaptacaoDetailPage.tsx`: exibir `usuarioMusicaNome`
- [ ] 7.10 Testes: `CaptacaoForm` (validação obrigatória, onSelect popula id+nome); hook de busca (debounce, min 2 chars); MSW mockando `/usuarios-musica`

## Sequenciamento

- Bloqueado por: 4.0 (endpoint de busca), 5.0 (contrato da captação)
- Desbloqueia: 8.0 (docs)
- Paralelizável: Não (última task de código)

## Detalhes de Implementação

**Skills de referência:** `react-code-quality` (Inglês, PascalCase, strict sem `any`, max ~300 linhas), `react-testing` (Vitest + RTL + jest-dom, MSW).

**Molde exato:** `frontend/src/features/arrecadacao/licencas/components/LicencaForm.tsx` — copiar o padrão do Autocomplete:
```tsx
const usuarioBuscaDebounced = useDebounce(usuarioBusca, 300);
const { data, isFetching } = useQuery({
  queryKey: ['usuarios-musica-id', usuarioBuscaDebounced],
  queryFn: () => buscarUsuariosMusica(usuarioBuscaDebounced),
  enabled: usuarioBuscaDebounced.length >= 2,
});
```

**Diferença crítica vs LicencaForm:** o `LicencaForm` chama `apiGetArr` (Arrecadação). Aqui usa `apiGetIden` (Identificação) — endpoint local contra a projeção. **Nunca** importar `apiArrecadacaoClient`.

**Componente reutilizável:** `frontend/src/shared/components/ui/autocomplete/` (já existe).

**Hook de busca:** novo, separado do `useBuscaCadastro` (que consulta o Cadastro para ISRC/ISWC — não confundir).

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Visão Geral dos Componentes (frontend), §Inventário (Frontend)
- Código existente: `LicencaForm.tsx` (molde Autocomplete + debounce + TanStack)
- Código existente: `CaptacaoForm.tsx`, `CaptacaoFilters.tsx`, `CaptacoesTable.tsx`, `CaptacaoDetailPage.tsx`
- Código existente: `apiIdentificacaoClient.ts` (`apiGetIden`)
- `react-code-quality`: GR-02 strict, GR-03 sem `any`, NC-01..NC-08

### Pontos Críticos

- **Usar `apiGetIden`, nunca `apiGetArr`** — a busca é contra a projeção local da Identificação.
- Validação: se nada selecionado, bloquear submit com "Selecione um usuário de música".
- Estado vazio do Autocomplete: "Nenhum usuário encontrado. Verifique o cadastro na Arrecadação."
- Editar captação existente: pré-popular `usuarioMusicaNome` no display do Autocomplete a partir do `initialData`.

### Fora de Escopo

- Tela de detalhe com link cliável para a Arrecadação (Non-Goal do PRD).
- Criação inline de usuário de música.

## Criterios de Sucesso

- `npm run build` verde (type-check + build).
- `npm run lint` sem erros.
- `CaptacaoForm` com Autocomplete: digitar ≥2 chars dispara busca; selecionar popula `usuarioMusicaId`+`usuarioMusicaNome`; submit sem seleção é bloqueado.
- `CaptacaoFilters` permite filtrar por usuário; lista filtra por `usuarioMusicaId`.
- Testes RTL verdes com MSW mockando o endpoint local.
