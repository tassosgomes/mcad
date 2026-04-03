---
status: done
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

Criar 6 mockups no Stitch para a feature de execuções antes de implementar componentes.

## Subtarefas

- [x] 6.1 Seção "Execuções" dentro do detalhe da captação (tabela paginada + botão "Adicionar Execução")
- [x] 6.2 Formulário de adição/edição (modal com busca autocomplete, campos de horário, campos condicionais, duração calculada)
- [x] 6.3 Componente de busca autocomplete (resultados tipados obra/fonograma, ISRC/ISWC, badges de status, footer "Criar pendente")
- [x] 6.4 Modal de criação de obra pendente (título + tipo de obra)
- [x] 6.5 Modal de criação de fonograma pendente (ISRC opcional + obra vinculada read-only)
- [x] 6.6 Dialog de confirmação de exclusão de execução

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0
- Paralelizável: Sim

## Critérios de Sucesso (Verificáveis)

- [x] 6 telas criadas no Stitch (projeto mcad, ID `533156784329699726`)
- [x] Autocomplete mostra resultados tipados (ícone + título + código + status)
- [x] Campos condicionais visíveis apenas para rubrica audiovisual
- [x] Duração exibida como "3min 45s" no formulário
