---
status: pending
parallelizable: false
blocked_by: ["12.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 13.0: Integração — FonogramaDetailPage

## Visão Geral

Integrar `ParticipacoesSection` na `FonogramaDetailPage` (F05) abaixo do FonogramaForm. Conectar depuração: `onDepuracaoRequired` abre o FonogramaDepuracaoModal existente.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` — importar e renderizar `ParticipacoesSection` abaixo do form. Passar fonogramaId, fonogramaStatus, onDepuracaoRequired.
- **Referência:**
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` (padrão de integração de seção)
  - `features/cadastro/fonogramas/components/FonogramaDepuracaoModal.tsx` (reutilizado)

## Subtarefas

- [ ] 13.1 Importar `ParticipacoesSection` de `@features/cadastro/participacoes`
- [ ] 13.2 Renderizar abaixo do FonogramaForm: `<ParticipacoesSection fonogramaId={fonograma.id} fonogramaStatus={fonograma.status} onDepuracaoRequired={() => setShowDepuracaoModal(true)} />`
- [ ] 13.3 Testar end-to-end: adicionar participantes → calcular → ajustar → depuração em LIBERADO
- [ ] 13.4 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Seção de participações visível na FonogramaDetailPage
- [ ] Fluxo completo: adicionar intérprete + produtor + músico → Calcular → 43,7/41,7/14,6 → soma 100%
- [ ] Ajustar intérprete manualmente → percentual customizado
- [ ] Adicionar participante após cálculo → badge "desatualizado"
- [ ] Recalcular → alerta → confirma → percentuais sobrescritos
- [ ] Operação em fonograma LIBERADO → modal depuração
- [ ] Read-only em fonograma DEPURADO
