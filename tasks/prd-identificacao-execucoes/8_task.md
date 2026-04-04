---
status: pending
parallelizable: false
blocked_by: [4.0, 7.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"none"</unblocks>
</task_context>

# Tarefa 8.0: Frontend — PendentesPage + Roteamento

## Visão Geral

Criar a PendentesPage com tabs (Lista / Impacto), integrar todos os componentes, adicionar rota e item na sidebar. Task final da F04.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/pendentes/pages/PendentesPage.tsx`
  - `frontend/src/features/identificacao/pendentes/index.ts`
- **Modificar:**
  - `frontend/src/features/identificacao/index.tsx` (adicionar rota `/pendentes`)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (adicionar "Pendentes" nos children de Identificação)
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacoesPage.tsx` (padrão page com filtros)

## Subtarefas

- [ ] 8.1 Criar `PendentesPage.tsx` — tabs "Lista" e "Impacto", gerencia estado de tab ativa, filtros, modais de resolução (individual + lote)
- [ ] 8.2 Criar `pendentes/index.ts` (barrel export)
- [ ] 8.3 Modificar `identificacao/index.tsx` — adicionar `<Route path="pendentes" element={<PendentesPage />} />`
- [ ] 8.4 Modificar `Sidebar.tsx` — adicionar `{ label: 'Pendentes', path: '/identificacao/pendentes' }` nos children de Identificação
- [ ] 8.5 Teste end-to-end manual:
  - Navegar para /identificacao/pendentes → lista de pendentes
  - Filtrar por rubrica → lista filtra
  - Tab Impacto → agrupamento por ISRC com contagem
  - Expandir accordion → ver captações afetadas
  - Resolver individual → modal com busca → confirmar → status muda
  - Resolver em lote → selecionar obra → checkboxes → confirmar → resultado parcial
  - Verificar contadores de captação atualizados após resolução

## Sequenciamento

- Bloqueado por: 4.0 (backend), 7.0 (componentes)
- Desbloqueia: Nenhum (task final)
- Paralelizável: Não

## Detalhes de Implementação

**PendentesPage.tsx:**
```tsx
export function PendentesPage() {
  const [activeTab, setActiveTab] = useState<'lista' | 'impacto'>('lista');
  const [filtros, setFiltros] = useState<PendenteFiltros>({ page: 1, size: 20, sort: '-criadoEm' });
  const [pendenteParaResolver, setPendenteParaResolver] = useState<ExecucaoPendente | null>(null);
  const [impactoParaLote, setImpactoParaLote] = useState<ImpactoPendente | null>(null);

  useDocumentTitle('Pendentes — Identificação');

  return (
    <div>
      <PageHeader title="Execuções Pendentes" />

      <div className={styles.tabs}>
        <button className={activeTab === 'lista' ? styles.active : ''} onClick={() => setActiveTab('lista')}>
          Lista
        </button>
        <button className={activeTab === 'impacto' ? styles.active : ''} onClick={() => setActiveTab('impacto')}>
          Impacto
        </button>
      </div>

      {activeTab === 'lista' && (
        <>
          <PendentesFilters filtros={filtros} onChange={setFiltros} />
          <PendentesTableWrapper filtros={filtros} onResolver={setPendenteParaResolver} />
        </>
      )}

      {activeTab === 'impacto' && (
        <ImpactoViewWrapper onResolverLote={setImpactoParaLote} />
      )}

      <ResolverPendenteModal
        pendente={pendenteParaResolver}
        isOpen={!!pendenteParaResolver}
        onClose={() => setPendenteParaResolver(null)}
        onSuccess={() => setPendenteParaResolver(null)}
      />

      <ResolverLoteModal
        identificador={impactoParaLote?.identificador ?? ''}
        execucoes={/* carregadas via hook */}
        isOpen={!!impactoParaLote}
        onClose={() => setImpactoParaLote(null)}
        onSuccess={() => setImpactoParaLote(null)}
      />
    </div>
  );
}
```

**Sidebar — atualizar:**
```typescript
{
  label: 'Identificação',
  icon: Search,
  basePath: '/identificacao',
  disabled: false,
  children: [
    { label: 'Captações', path: '/identificacao/captacoes' },
    { label: 'Pendentes', path: '/identificacao/pendentes' },  // NOVO
  ],
},
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Navegação `/identificacao/pendentes` renderiza a página
- [ ] Sidebar mostra "Pendentes" como sub-item de Identificação
- [ ] Tabs Lista/Impacto alternam corretamente
- [ ] Resolução individual → toast sucesso → pendente desaparece
- [ ] Resolução em lote → resultado parcial exibido
- [ ] Link na captação navega para detalhe
