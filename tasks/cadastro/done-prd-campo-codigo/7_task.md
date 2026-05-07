---
status: done
parallelizable: false
blocked_by: ["3.0", "6.0"]
---

<task_context>
<domain>e2e</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Validação E2E

## Visão Geral

Validação manual end-to-end com backend + frontend rodando: verificar que código aparece em todas as telas, UUID está oculto, filtro por código funciona, depuração gera novo código.

## Subtarefas

- [x] 7.1 Listagem associações: códigos 1-7 como primeira coluna
- [x] 7.2 Criar titular → listagem mostra código sequencial (#N)
- [x] 7.3 Criar obra → detalhe exibe "Obra #N"
- [x] 7.4 Criar fonograma → detalhe exibe "Fonograma #N"
- [x] 7.5 Filtrar por código: digitar número exato → retorna 1 resultado
- [x] 7.6 Depurar obra → nova obra tem código diferente (maior), banner exibe "#N"
- [x] 7.7 UUID: verificar que NÃO aparece em nenhuma parte da interface
- [x] 7.8 API: verificar que responses contêm `id` (UUID) E `codigo` (long)
- [x] 7.9 Editar titular → código NÃO muda após edição

## Critérios de Sucesso (Verificáveis)

- [x] Código visível em todas as listagens e detalhes
- [x] UUID oculto da interface
- [x] Filtro por código funciona (busca exata)
- [x] Depuração gera novo código
- [x] Código imutável após edição
