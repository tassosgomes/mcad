---
status: pending
parallelizable: false
blocked_by: ["11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"13.0"</unblocks>
</task_context>

# Tarefa 12.0: Feature — TitularidadesSection + Integração ObraDetailPage

## Relacionada às User Stories

- Todas as HUs — composição final + integração na tela de obra

## Visão Geral

Criar `TitularidadesSection` (composição: header + AddForm + Table + SomaIndicator + EditModal) e integrá-la na `ObraDetailPage` existente (F03). A seção emite `onDepuracaoRequired` quando recebe 409 de obra LIBERADA, e a ObraDetailPage reutiliza o DepuracaoModal existente.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/titularidades/components/TitularidadesSection.tsx` + `.module.css`
  - `features/cadastro/titularidades/index.ts`
- **Modificar:**
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — importar e renderizar `TitularidadesSection` abaixo do formulário de dados da obra. Passar `obraId`, `obraStatus`, `onDepuracaoRequired`.
- **Referência:**
  - `tasks/prd-titularidades-autorais/techspec-frontend.md` (seção "TitularidadesSection")
  - `features/cadastro/obras/components/DepuracaoModal.tsx` (reutilizado)
- **Skills:** `react-architecture` — composição, integração cross-feature

## Subtarefas

- [ ] 12.1 Criar `TitularidadesSection` — props: obraId, obraStatus, onDepuracaoRequired. Encapsula: header ("Titulares Autorais" + botão "Adicionar Titular"), AddTitularidadeForm (toggle show/hide), TitularidadesTable, SomaIndicator, EditPercentualModal. isReadOnly = DEPURADA || DOMINIO_PUBLICO.
- [ ] 12.2 Implementar fluxo de depuração: mutation catch → se err.code === 'DEPURACAO_NECESSARIA' → chama onDepuracaoRequired() → ObraDetailPage abre DepuracaoModal existente
- [ ] 12.3 Criar `index.ts` — exporta TitularidadesSection + hooks
- [ ] 12.4 Integrar na ObraDetailPage: `<TitularidadesSection obraId={obra.id} obraStatus={obra.status} onDepuracaoRequired={() => setShowDepuracaoModal(true)} />`
- [ ] 12.5 Verificar: `npm run build`

## Detalhes de Implementação

### Integração na ObraDetailPage
```typescript
// Em ObraDetailPage.tsx:
import { TitularidadesSection } from '@features/cadastro/titularidades';

// No render, após ObraForm e antes de IswcSection:
{obra && (
  <TitularidadesSection
    obraId={obra.id}
    obraStatus={obra.status}
    onDepuracaoRequired={() => setShowDepuracaoModal(true)}
  />
)}
```

### Fluxo de depuração (dentro da TitularidadesSection)
```typescript
const handleAdd = async (req) => {
  try {
    await addMutation.mutateAsync(req);
    showToast('Titular adicionado', 'success');
  } catch (err: any) {
    if (err.code === 'DEPURACAO_NECESSARIA') {
      onDepuracaoRequired(); // delega para ObraDetailPage
    } else {
      showToast(err.detail || 'Erro', 'error');
    }
  }
};
```

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Seção de titularidades visível na ObraDetailPage
- [ ] Adicionar titular em obra PENDENTE → sucesso, soma atualizada
- [ ] Adicionar titular em obra LIBERADA → modal de depuração (reutilizado de F03)
- [ ] Read-only em obra DEPURADA (sem botões)
- [ ] Soma exibida com cor dinâmica
