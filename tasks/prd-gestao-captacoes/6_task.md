---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/frontend</domain>
<type>documentation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — Mockups no Stitch

## Visão Geral

Criar mockups obrigatórios no Stitch (projeto mcad, ID `533156784329699726`) para validação visual antes da implementação dos componentes React.

## Requisitos

- 4 telas desenhadas no Stitch
- Dados de exemplo realistas (extraídos do api-contract.yaml)
- Aprovação visual antes de iniciar Task 8.0

## Subtarefas

- [x] 6.1 Tela 1 — Listagem de Captações: tabela com 5-8 captações, filtros (rubrica, período, status, responsável), sort, paginação, badge por status
- [x] 6.2 Tela 2 — Detalhe de Captação: header com status badge, cards de resumo de execuções (total/identificadas/pendentes), formulário de edição
- [x] 6.3 Tela 3 — Formulário de Criação/Edição: dropdown de rubrica (com indicador de classificação para audiovisuais), date picker, campo texto livre, botões
- [x] 6.4 Tela 4 — Dialog de Confirmação de Exclusão: aviso com contador de execuções, botões confirmar/cancelar

## Sequenciamento

- Bloqueado por: Nenhum (pode iniciar imediatamente)
- Desbloqueia: 8.0 (componentes dependem dos mockups aprovados)
- Paralelizável: Sim (independente do backend)

## Detalhes de Implementação

**Projeto Stitch:** mcad (ID `533156784329699726`)

**Dados de exemplo para os mockups:**

Captações na listagem:
| Rubrica | Período | Usuário de Música | Status | Responsável |
|---------|---------|-------------------|--------|-------------|
| TV Aberta | 15/01/2026 | TV Globo - Rede Nacional | ABERTA | Maria Silva |
| Rádio AM/FM | 15/01/2026 | Rádio Globo SP | ABERTA | João Santos |
| Streaming Áudio | 14/01/2026 | Spotify BR | FECHADA | Maria Silva |
| Cinema | 14/01/2026 | Cinemark SP | ABERTA | Pedro Lima |
| TV Fechada | 13/01/2026 | HBO Max | CANCELADA | Ana Costa |
| Show | 13/01/2026 | Rock in Rio | FECHADA | João Santos |

Badges de status: ABERTA=azul, FECHADA=verde, CANCELADA=cinza

Rubricas no dropdown com indicador:
- Rádio AM/FM
- TV Aberta ⚡ (Classificação obrigatória)
- TV Fechada ⚡
- Cinema ⚡
- Streaming Vídeo (VOD) ⚡
- Streaming Áudio
- Show

## Critérios de Sucesso (Verificáveis)

- [x] 4 telas criadas no Stitch
- [x] Mockups usam dados realistas do domínio de Identificação
- [x] Indicador visual de "classificação obrigatória" presente no dropdown de rubricas
- [x] Dialog de exclusão mostra contagem de execuções
