---
status: pending
parallelizable: false
blocked_by: [5.0, 8.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"none"</unblocks>
</task_context>

# Tarefa 9.0: Frontend — Integração na CaptacaoDetailPage

## Relacionada aos Requisitos

- RF-01 a RF-08 — integração completa de todos os componentes na página existente

## Visão Geral

Integrar a seção `ExecucoesSection` na `CaptacaoDetailPage` existente (F01), conectando todos os componentes, hooks e fluxos. Task final que fecha a feature.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` (adicionar `ExecucoesSection` abaixo do formulário)
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.tsx` (componente a integrar)
  - `frontend/src/features/identificacao/captacoes/types/captacao.ts` (Rubrica, StatusCaptacao)

## Subtarefas

- [ ] 9.1 Importar `ExecucoesSection` na `CaptacaoDetailPage`
- [ ] 9.2 Passar props: `captacaoId`, `rubrica`, `captacaoStatus`, `isOwner`
- [ ] 9.3 Posicionar abaixo do formulário de captação e acima do histórico (se houver)
- [ ] 9.4 Verificar que os contadores de resumo (Total/Identificadas/Pendentes) atualizam ao adicionar/excluir execuções
- [ ] 9.5 Teste de integração manual end-to-end:
  - Criar captação TV Aberta → abrir detalhe → adicionar execução com busca → verificar campos condicionais (tipo utilização obrigatório)
  - Criar captação Rádio AM/FM → adicionar execução → verificar campos condicionais ocultos
  - Buscar obra inexistente → criar obra pendente inline → verificar status PENDENTE
  - Editar execução → alterar obra → verificar recalculo de status
  - Excluir execução → verificar contadores atualizados

## Sequenciamento

- Bloqueado por: 5.0 (backend rodando), 8.0 (componentes prontos)
- Desbloqueia: Nenhum (task final)
- Paralelizável: Não

## Detalhes de Implementação

**CaptacaoDetailPage.tsx — adição:**
```tsx
import { ExecucoesSection } from '../components/ExecucoesSection';

// Dentro do JSX, após <CaptacaoForm> e antes do fechamento:
<ExecucoesSection
  captacaoId={captacao.id}
  rubrica={captacao.rubrica}
  captacaoStatus={captacao.status}
  isOwner={canWrite && captacao.analistaResponsavel.id === userId}
/>
```

**Contadores de resumo — já funcionam automaticamente:**
O `useCaptacao(id)` é invalidado pelas mutations de execuções (`queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] })`), então os cards Total/Identificadas/Pendentes atualizam sem código adicional.

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] Seção "Execuções" visível no detalhe da captação
- [ ] Criar execução com rubrica audiovisual → campos condicionais obrigatórios
- [ ] Criar execução com rubrica não-audiovisual → sem campos condicionais
- [ ] Buscar obra → selecionar → IDENTIFICADA
- [ ] Criar obra pendente inline → execução PENDENTE
- [ ] Editar execução → alterar obra → status recalculado
- [ ] Excluir execução → contadores de resumo atualizados
- [ ] Consultor → sem botões de ação (somente leitura)
