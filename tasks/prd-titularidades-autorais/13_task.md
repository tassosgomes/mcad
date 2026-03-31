---
status: pending
parallelizable: false
blocked_by: ["12.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 13.0: Integração — IswcSection temTitulares real

## Visão Geral

Conectar o componente `IswcSection` (F03) com dados reais de titularidades. O `temTitulares` que era placeholder (`false`) agora vem de `useTitularidades`. Também atualizar a sidebar para incluir label visual (nenhuma nova rota — titularidades são seção da obra, não página).

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — importar `useTitularidades`, derivar `temTitulares` de `data.titularidades.length > 0`, passar para `IswcSection`
  - `features/cadastro/obras/components/IswcSection.tsx` — garantir que `temTitulares` prop é boolean (já existe, verificar tipagem)
- **Referência:**
  - `tasks/prd-titularidades-autorais/techspec-frontend.md` (seção "Integração com IswcSection")
- **Skills:** `react-architecture`

## Subtarefas

- [ ] 13.1 Na ObraDetailPage: `const { data: titularidadesData } = useTitularidades(obra.id);` e `const temTitulares = (titularidadesData?.titularidades.length ?? 0) > 0;`
- [ ] 13.2 Passar `temTitulares` para `<IswcSection obra={obra} temTitulares={temTitulares} />`
- [ ] 13.3 Testar end-to-end: obra sem titulares → ISWC desabilitado. Adicionar titular → ISWC habilitado. Obter ISWC → sucesso com autores reais.
- [ ] 13.4 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Obra sem titulares → botão "Obter ISWC" desabilitado com tooltip
- [ ] Obra com titulares → botão habilitado
- [ ] Obter ISWC envia nomes dos autores reais para API
- [ ] Fluxo completo: criar obra → adicionar titulares → obter ISWC → sucesso
