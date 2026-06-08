---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>frontend/arrecadacao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_client</dependencies>
<unblocks>6.0, 7.0</unblocks>
</task_context>

# Tarefa 5.0: Frontend — CRUD de Rubricas

## Visão Geral

Implementar a interface completa de gestão de rubricas no módulo Arrecadação do frontend: listagem, criação, edição, inativação e reativação.

## Requisitos

- Tela de listagem com todas as rubricas (ativas e inativas)
- Formulário de criação com sugestão automática de sigla
- Formulário de edição (nome e exigeClassificacao)
- Modal de inativação/reativação com justificativa
- Integração com API de Arrecadação
- Proteção por permissões

## Subtarefas

- [ ] 5.1 Criar `features/arrecadacao/rubricas/types/rubrica.ts`
  ```typescript
  export interface Rubrica {
    id: string;
    sigla: string;
    nome: string;
    exigeClassificacao: boolean;
    ativo: boolean;
  }
  ```
  
- [ ] 5.2 Criar `features/arrecadacao/rubricas/api/rubricasApi.ts`
  - `listarRubricas()` — GET /api/v1/rubricas
  - `buscarRubrica(id)` — GET /api/v1/rubricas/{id}
  - `criarRubrica(data)` — POST /api/v1/rubricas
  - `atualizarRubrica(id, data)` — PUT /api/v1/rubricas/{id}
  - `inativarRubrica(id, justificativa)` — POST /api/v1/rubricas/{id}/inativar
  - `ativarRubrica(id, justificativa)` — POST /api/v1/rubricas/{id}/ativar
  
- [ ] 5.3 Criar hooks
  - `useRubricas()` — listagem
  - `useCreateRubrica()` — criação
  - `useUpdateRubrica()` — atualização
  - `useInativarRubrica()` — inativação
  - `useAtivarRubrica()` — reativação
  
- [ ] 5.4 Criar componentes
  - `RubricasTable` — tabela com colunas: sigla, nome, exigeClassificacao (badge Sim/Não), ativo (badge), ações
  - `RubricaForm` — formulário de criação/edição com:
    - Campo nome (texto)
    - Checkbox exigeClassificacao
    - Sugestão de sigla em tempo real (à medida que digita o nome)
    - Campo de sigla editável (preenche com sugestão, mas usuário pode alterar)
  - `InativarRubricaModal` — modal com textarea de justificativa (min 10 chars)
  
- [ ] 5.5 Criar páginas
  - `RubricasPage` — listagem com filtro por status (ativo/inativo/todos)
  - `RubricaCreatePage` — formulário de criação
  - `RubricaEditPage` — formulário de edição
  
- [ ] 5.6 Adicionar rotas
  - Em `features/arrecadacao/index.tsx`:
    ```tsx
    <Route path="rubricas" element={<RubricasPage />} />
    <Route path="rubricas/nova" element={<RubricaCreatePage />} />
    <Route path="rubricas/:id/editar" element={<RubricaEditPage />} />
    ```
  
- [ ] 5.7 Adicionar no sidebar
  - Em `Sidebar.tsx`, grupo Arrecadação, adicionar:
    ```tsx
    { label: 'Rubricas', path: '/arrecadacao/rubricas', requiredPermission: 'arrecadacao:default:rubrica:visualizar' }
    ```
  
- [ ] 5.8 Proteger rotas em `routes.tsx`
  - Adicionar `arrecadacao:default:rubrica:visualizar` no array `COPILOTO_PERMISSIONS` (se ainda não estiver)
  - Rotas de criação/edição protegidas com `RequirePermission`

## Detalhes de Implementação

### Sugestão de Sigla em Tempo Real

```tsx
// No RubricaForm, usar useEffect para gerar sugestão
useEffect(() => {
  if (nome && !siglaTouched) {
    const sugerida = gerarSiglaSugestao(nome);
    setValue('sigla', sugerida);
  }
}, [nome]);

// Função gerarSiglaSugestao (duplicar algoritmo do backend em TypeScript)
function gerarSiglaSugestao(nome: string): string {
  const preposicoes = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'NO', 'NA', 'A', 'O', 'E', 'PARA', 'POR', 'COM']);
  let normalizado = nome.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s\-]/g, ' ');
  const palavras = normalizado.split(/[\s\-]+/).filter(p => p);
  let significativas = palavras.filter(p => !preposicoes.has(p));
  if (significativas.length === 0) significativas = palavras;
  let sigla = significativas.map(p => p[0]).join('_');
  if (sigla.length < 3 && significativas.length > 0) {
    sigla = significativas[0].substring(0, Math.min(3, significativas[0].length));
  }
  if (sigla.length > 20) sigla = sigla.substring(0, 20);
  return sigla;
}
```

### Indicação Visual de Status

```tsx
// Badge de status na tabela
<Badge variant={rubrica.ativo ? 'success' : 'muted'}>
  {rubrica.ativo ? 'Ativa' : 'Inativa'}
</Badge>

// Rubricas inativas com opacidade reduzida
<tr className={!rubrica.ativo ? styles.inativa : ''}>
```

## Critérios de Sucesso

- [ ] Usuário consegue criar rubrica com sigla sugerida automaticamente
- [ ] Usuário consegue editar nome/exigeClassificacao
- [ ] Usuário consegue inativar/reativar com justificativa
- [ ] Consultor só vê listagem (sem botões de ação)
- [ ] Sugestão de sigla aparece em tempo real enquanto digita o nome
- [ ] Filtro por status (ativo/inativo/todos) funciona na listagem
