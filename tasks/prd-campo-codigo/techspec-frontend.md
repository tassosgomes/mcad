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
