# Backlog Futuro - Auditoria de telas

## ecad-auditoria: filtro nativo por nivel

- Adicionar filtro nativo por `auditLevel` nas consultas de eventos.
- Campos candidatos: `metadata.auditLevel` e `screen.businessContext.auditLevel`.
- Manter compatibilidade com aliases de `screenId`.
- Atualizar BFF para remover filtro client-side quando o servico central suportar o filtro.
- Cobrir com testes de contrato para `SILVER` e `GOLD`.

## ecad-auditoria: purge fisico de 90 dias no Oracle

- Criar job operacional para remocao fisica de eventos Prata/Ouro e snapshots Ouro apos 90 dias.
- Validar impacto em investigacoes abertas antes da exclusao.
- Registrar metricas de linhas removidas, duracao e falhas do purge.
- Definir procedimento de reprocessamento/retentativa em caso de falha.
- Documentar excecoes legais ou de compliance quando houver retencao estendida.
