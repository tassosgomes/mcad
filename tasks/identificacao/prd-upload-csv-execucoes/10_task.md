---
status: completed
parallelizable: false
blocked_by: [6.0, 9.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>"none"</unblocks>
</task_context>

# Tarefa 10.0: Frontend — Integração na CaptacaoDetailPage

## Visão Geral

Integrar a seção `UploadsSection` na `CaptacaoDetailPage`, abaixo da `ExecucoesSection`. Task final que fecha a feature.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` (adicionar UploadsSection)
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/UploadsSection.tsx`

## Subtarefas

- [x] 10.1 Importar `UploadsSection` na CaptacaoDetailPage
- [x] 10.2 Posicionar abaixo de `ExecucoesSection`
- [x] 10.3 Passar props: `captacaoId`, `captacaoAberta`, `isOwner`
- [x] 10.4 Verificar que contadores de resumo atualizam após processamento do CSV (invalidação cruzada do useUpload)
- [x] 10.5 Teste end-to-end manual:
  - Upload CSV válido em captação TV Aberta → PROCESSANDO → CONCLUIDO → execuções criadas
  - Upload CSV com erros → CONCLUIDO_COM_ERROS → relatório de erros exibido
  - Upload em captação FECHADA → 422 STATUS_INVALIDO
  - Upload por analista não-dono → 403 FORBIDDEN
  - Contadores de resumo atualizados após processamento

## Sequenciamento

- Bloqueado por: 6.0 (backend), 9.0 (componentes)
- Desbloqueia: Nenhum (task final)
- Paralelizável: Não

## Detalhes de Implementação

```tsx
// CaptacaoDetailPage.tsx — layout atualizado:
<ExecucoesSection
  captacaoId={captacao.id}
  rubrica={captacao.rubrica}
  captacaoStatus={captacao.status}
  isOwner={canWrite && captacao.analistaResponsavel.id === userId}
/>

<UploadsSection
  captacaoId={captacao.id}
  captacaoAberta={captacao.status === 'ABERTA'}
  isOwner={canWrite && captacao.analistaResponsavel.id === userId}
/>
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Seção "Uploads CSV" visível no detalhe da captação
- [ ] Upload CSV → 202 → polling → status atualiza → execuções criadas
- [ ] CSV com erros → relatório com linha/coluna/erro
- [ ] Contadores de resumo atualizados após processamento
- [ ] Consultor → botão "Importar CSV" oculto
