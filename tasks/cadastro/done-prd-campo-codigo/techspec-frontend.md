# Tech Spec Frontend — Adição do Campo Código

> **PRD:** `tasks/prd-campo-codigo/prd.md`
> **Data:** 2026-04-03

---

## Resumo Executivo

Modificação retroativa em todas as telas: substituir UUID como identificador visual pelo código numérico com prefixo "#". Impacta: tipos TypeScript (+codigo), todas as tabelas (nova coluna "Código" como primeira), todos os PageHeaders (ex: "Titular #67494"), banners de depuração (código em vez de link UUID), filtros (+código). UUID oculto da interface.

## Design de Implementação

### Tipos — Adicionar Codigo

```typescript
// Em TODAS as interfaces de response:
// Associacao, Titular, ObraMusical, Fonograma, FonogramaResumo, TitularResumo, AssociacaoResumo

export interface Titular {
  id: string;        // UUID — mantido para operações internas
  codigo: number;    // NOVO — identificador visual
  nome: string;
  // ...
}
```

### Tabelas — Código como Primeira Coluna

```typescript
// Padrão para TODAS as tabelas:
const columns = [
  { key: 'codigo', header: 'Código', render: (v: number) => <span className={styles.mono}>#{v}</span> },
  // ... colunas existentes ...
];
```

### PageHeaders — Código no Título

```typescript
// Antes:  <PageHeader title="Titular" />
// Depois: <PageHeader title={`Titular #${titular.codigo}`} />

// Obras:     "Obra #1542"
// Fonogramas: "Fonograma #5672"
```

### Banners de Depuração — Código

```typescript
// Antes:  "Nova versão: [link UUID]"
// Depois: "Nova versão: #1543 [link]"

// DepuracaoBanner e FonogramaDepuracaoBanner:
<Link to={`/cadastro/obras/${obraDepuradaParaId}`}>
  Ver nova versão: #{novaObraCodigo} →
</Link>
```

> **Nota:** O banner precisa do código da nova obra/fonograma. Os responses de depuração (`DepuracaoResponse`) já retornam as entidades completas com `codigo`.

### Filtro por Código

```typescript
// Em TitularesFilters, ObrasFilters, FonogramasFilters:
// Adicionar campo "Código" (input numérico, busca exata)

<TextInput
  label="Código"
  value={filtros.codigo ?? ''}
  onChange={(v) => setFiltros(prev => ({ ...prev, codigo: v ? Number(v) : undefined, page: 1 }))}
  placeholder="Ex: 67494"
  mono
  type="number"
/>
```

### Filtros Types — Adicionar Codigo

```typescript
// TitularFiltros, ObraFiltros, FonogramaFiltros:
export interface TitularFiltros {
  // ... existentes ...
  codigo?: number;  // NOVO
}
```

### Sidebar / Navegação — Sem impacto

A sidebar usa paths com labels fixos ("Associações", "Titulares", etc.) — sem impacto.

---

## Inventário de Artefatos

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| **Types (6+)** | |
| `features/cadastro/associacoes/types/associacao.ts` | +codigo: number |
| `features/cadastro/titulares/types/titular.ts` | +codigo em Titular, TitularFiltros |
| `features/cadastro/obras/types/obra.ts` | +codigo em ObraMusical, ObraFiltros |
| `features/cadastro/fonogramas/types/fonograma.ts` | +codigo em Fonograma, FonogramaResumo, FonogramaFiltros |
| `features/cadastro/titularidades/types/titularidade.ts` | +codigo em TitularResumo |
| `features/cadastro/participacoes/types/participacao.ts` | +codigo em TitularResumo (se tipo diferente) |
| **Tabelas (6)** | |
| `features/cadastro/associacoes/components/AssociacoesTable.tsx` | +coluna "Código" como primeira (mono, #N) |
| `features/cadastro/titulares/components/TitularesTable.tsx` | +coluna "Código" como primeira |
| `features/cadastro/obras/components/ObrasTable.tsx` | +coluna "Código" como primeira |
| `features/cadastro/fonogramas/components/FonogramasTable.tsx` | +coluna "Código" como primeira |
| `features/cadastro/titularidades/components/TitularidadesTable.tsx` | +codigo no titular resumo |
| `features/cadastro/participacoes/components/ParticipacoesTable.tsx` | +codigo no titular resumo |
| **PageHeaders (4)** | |
| `features/cadastro/titulares/pages/TitularEditPage.tsx` | título: "Titular #{codigo}" |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` | título: "Obra #{codigo}" |
| `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` | título: "Fonograma #{codigo}" |
| `features/cadastro/associacoes/pages/AssociacoesPage.tsx` | tabela com código (page sem detalhe individual) |
| **Filtros (3)** | |
| `features/cadastro/titulares/components/TitularesFilters.tsx` | +campo "Código" (input numérico) |
| `features/cadastro/obras/components/ObrasFilters.tsx` | +campo "Código" |
| `features/cadastro/fonogramas/components/FonogramasFilters.tsx` | +campo "Código" |
| **Banners de Depuração (2)** | |
| `features/cadastro/obras/components/DepuracaoBanner.tsx` | exibir código da nova obra (#N) em vez de UUID |
| `features/cadastro/fonogramas/components/FonogramaDepuracaoBanner.tsx` | exibir código do novo fonograma |
| **Seções integradas (2)** | |
| `features/cadastro/fonogramas/components/ObraFonogramasSection.tsx` | +codigo na tabela de fonogramas da obra |
| **API functions (4)** | |
| `features/cadastro/titulares/api/titularesApi.ts` | +codigo no query param de listagem |
| `features/cadastro/obras/api/obrasApi.ts` | +codigo no query param |
| `features/cadastro/fonogramas/api/fonogramasApi.ts` | +codigo no query param |

---

*Tech Spec Frontend gerada.*

---

## Apêndice — Implementação Real no Frontend (2026-05-19)

Este apêndice descreve o estado encontrado em `frontend/src/features/cadastro`. A especificação original acima permanece preservada; os itens abaixo registram o comportamento efetivo da UI e dos tipos TypeScript.

### Types e Contratos no Frontend

Implementado:

| Arquivo | Estado real |
|---------|-------------|
| `associacoes/types/associacao.ts` | `Associacao` inclui `codigo: number`. |
| `titulares/types/titular.ts` | `Titular`, `AssociacaoResumo` e `TitularFiltros` incluem `codigo`. |
| `obras/types/obra.ts` | `ObraMusical` e `ObraFiltros` incluem `codigo`; `DepuracaoResponse` usa `obraDepurada` e `novaObra` completos. |
| `fonogramas/types/fonograma.ts` | `Fonograma`, `FonogramaResumo` e `FonogramaFiltros` incluem `codigo`. |
| `titularidades/types/titularidade.ts` | `TitularResumo` inclui `codigo`. |
| `participacoes/types/participacao.ts` | `TitularResumo` inclui `codigo`. |

Divergências de contrato observadas:

- `DepuracaoFonogramaResponse` no frontend está tipado como resposta achatada (`fonogramaOriginalId`, `novoFonogramaId`, `novoIsrcFormatado`), mas o backend implementado retorna `fonogramaDepurado` e `novoFonograma` completos. Isso afeta a navegação pós-depuração, que hoje usa `response.novoFonogramaId`.
- `FonogramaListResponse.data` no frontend está tipado como `FonogramaResumo[]`, enquanto o backend retorna `IEnumerable<FonogramaResponse>`. A UI usa um subconjunto compatível, incluindo `codigo`, mas o tipo não espelha o contrato real.
- O tipo `Fonograma.obra` no frontend contém apenas `id` e `titulo`; o backend também envia `codigo` no `ObraResumoResponse`.

### API Client

Implementado:

| API | Estado real |
|-----|-------------|
| `titularesApi.getTitulares` | Envia `codigo` como query param quando `filtros.codigo` está preenchido. |
| `obrasApi.getObras` | Envia `codigo` como query param quando `filtros.codigo` está preenchido. |
| `fonogramasApi.getFonogramas` | Envia `codigo` como query param quando `filtros.codigo` está preenchido. |

Observação: o envio usa condição truthy (`if (filtros.codigo)`), o que é suficiente para os códigos reais gerados (> 0), mas não enviaria `codigo=0`.

### Tabelas e Exibição Visual

Implementado com coluna “Código” e prefixo `#`:

| Tela/componente | Estado real |
|-----------------|-------------|
| `AssociacoesTable.tsx` | Código como primeira coluna, monoespaçado. |
| `TitularesTable.tsx` | Código como primeira coluna, monoespaçado, sort button para `codigo`. |
| `ObrasTable.tsx` | Código como primeira coluna, monoespaçado, sort button para `codigo`. |
| `FonogramasTable.tsx` | Código como primeira coluna, monoespaçado, sort button para `codigo`. |
| `TitularidadesTable.tsx` | Código do titular aparece na primeira coluna. |
| `ParticipacoesTable.tsx` | Código do titular aparece na primeira coluna. |
| `ObraFonogramasSection.tsx` | Código do fonograma aparece na tabela de fonogramas da obra. |

Parcial:

- As listagens principais mostram controle visual de ordenação por código, mas o backend ainda não implementa `sort=codigo`/`sort=-codigo`; o resultado real cai no fallback server-side.
- Os defaults de UI continuam `nome` para Titulares, `titulo` para Obras e `isrc` para Fonogramas; não há default `codigo DESC`.
- Em linhas depuradas, as tabelas mostram links textuais como “ver nova versão”/“ver ativo”; o código da entidade substituta aparece nos banners de detalhe, não necessariamente na linha da listagem.

### PageHeaders e Detalhes

Implementado:

| Tela | Estado real |
|------|-------------|
| `TitularEditPage.tsx` | `PageHeader` usa `Titular #${titular.codigo}`. |
| `ObraDetailPage.tsx` | `PageHeader` usa `Obra #${obra.codigo}`. |
| `FonogramaDetailPage.tsx` | `PageHeader` usa `Fonograma #${fonograma.codigo}`. |
| Associações | Não há detalhe individual; a listagem mostra o código. |

Os UUIDs continuam sendo usados internamente em rotas, hooks, query keys, ações de tabela e navegação.

### Filtros por Código

Implementado:

| Componente | Estado real |
|------------|-------------|
| `TitularesFilters.tsx` | Input `type="number"` com debounce de 300 ms, parse via `parseInt`, atualiza `codigo` e reseta `page` para 1. |
| `ObrasFilters.tsx` | Input `type="number"` com debounce de 300 ms, parse via `parseInt`, atualiza `codigo` e reseta `page` para 1. |
| `FonogramasFilters.tsx` | Input `type="number"` com debounce de 400 ms, parse via `parseInt`, atualiza `codigo` e reseta `page` para 1. |

Não há validação customizada além de `type="number"` e `parseInt`; entradas inválidas viram `undefined`.

### Banners e Depuração

Implementado:

| Componente | Estado real |
|------------|-------------|
| `DepuracaoBanner.tsx` | Recebe `obraDepuradaParaId`, carrega a nova obra com `useObra` e exibe `#${novaObra.codigo}` quando disponível. |
| `FonogramaDepuracaoBanner.tsx` | Recebe `fonogramaDepuradoParaId`, carrega o novo fonograma com `useFonograma` e exibe `#${novoFonograma.codigo}` quando disponível. |
| `DepuracaoModal.tsx` | Após depurar obra, navega para `res.novaObra.id`, alinhado ao backend real. |
| `FonogramaDepuracaoModal.tsx` | Após depurar fonograma, navega para `response.novoFonogramaId`; isto diverge do backend real, que retorna `novoFonograma.id` dentro de objeto aninhado. |

### UUID na Interface

Estado real:

- Nas telas principais de cadastro, o UUID não é usado como identificador visual; o código aparece com prefixo `#`.
- O UUID ainda é usado nos links e rotas internas, como esperado.
- Superfícies de auditoria/histórico fora da tela principal de cadastro ainda exibem `entityId` técnico em modal/filtros de auditoria. Portanto, a regra “UUID não visível em nenhuma parte da interface” não está completamente satisfeita no app como um todo.

### Testes Frontend Observados

Não foram encontrados testes frontend específicos para:

- Renderização de `#codigo` em tabelas e PageHeaders.
- Filtro de código enviando query param correto.
- Banner de depuração mostrando código da nova obra/fonograma.
- Ordenação por código ou default `codigo DESC`.
- Contrato real de `DepuracaoFonogramaResponse`.

---

## Apêndice — Revalidação Frontend do Código Atual (2026-05-20)

Esta seção foi adicionada após nova leitura do código atual em `frontend/src/features/cadastro` e componentes de auditoria consumidos por essas telas. Ela apenas complementa o conteúdo já existente.

### Pontos confirmados

| Área | Estado atual |
|------|--------------|
| Código visual | Tabelas, PageHeaders e banners continuam exibindo `#codigo` nas superfícies principais de Titulares, Obras e Fonogramas. |
| Filtro por código | `titularesApi`, `obrasApi` e `fonogramasApi` continuam enviando `codigo` quando o filtro está preenchido. |
| Ordenação visual | `TitularesTable`, `ObrasTable` e `FonogramasTable` continuam oferecendo sort na coluna Código e enviam `codigo`/`-codigo` ao estado da listagem. |

### Divergências e riscos atualizados

| Item | Detalhe |
|------|---------|
| UUID visível via histórico | `RowAuditHistoryButton` está presente em `AssociacoesTable`, `TitularesTable`, `ObrasTable`, `FonogramasTable`, `TitularidadesTable` e `ParticipacoesTable`. Quando o usuário tem permissão de auditoria, `RowAuditHistoryModal` exibe `<strong>{entityId}</strong>`, que recebe o UUID técnico da linha. |
| Depuração de fonograma | `FonogramaDepuracaoModal.tsx` navega para `response.novoFonogramaId`, mas o backend retorna `novoFonograma.id` dentro de objeto aninhado. O tipo `DepuracaoFonogramaResponse` em `fonograma.ts` continua achatado e incompatível com o contrato real. |
| Resumo de obra no fonograma | `Fonograma.obra` e `FonogramaResumo.obra` seguem tipados só com `id` e `titulo`, apesar de o backend enviar também `codigo` em `ObraResumoResponse`. |
| Ordenação por código | A UI envia `sort=codigo`/`sort=-codigo`, mas o backend ainda não interpreta esses valores; o indicador visual de sort pode não corresponder à ordenação real. |
| Query param `codigo=0` | Os clients continuam usando condição truthy (`if (filtros.codigo)`), então não enviam zero. Como os códigos reais começam em 1, isso não afeta o fluxo nominal. |

### Ajustes recomendados a partir da revalidação

- Atualizar `DepuracaoFonogramaResponse` no frontend para `{ fonogramaDepurado: Fonograma; novoFonograma: Fonograma }`.
- Alterar a navegação pós-depuração de fonograma para `response.novoFonograma.id`.
- Decidir se o modal de histórico deve exibir `#codigo`/label de negócio em vez do UUID quando aberto a partir das telas de cadastro.
- Só manter o sort visual por Código como comportamento final depois que o backend tratar `codigo` e `-codigo`.
