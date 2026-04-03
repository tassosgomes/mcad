---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/api+testing</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: API — Endpoints (+query param codigo) + Testes

## Visão Geral

Adicionar query param `codigo` nos 3 endpoints de listagem (Titulares, Obras, Fonogramas). Testes: verificar que POST retorna codigo, GET filtra por codigo, seed tem códigos 1-7, depuração gera novo código.

## Arquivos Envolvidos

- **Modificar:**
  - `1-Services/.../Endpoints/TitularEndpoints.cs` — +query param `codigo` (long?) no GET listagem
  - `1-Services/.../Endpoints/ObraEndpoints.cs` — +idem
  - `1-Services/.../Endpoints/FonogramaEndpoints.cs` — +idem
- **Criar:**
  - `5-Tests/Cadastro.IntegrationTests/CodigoIntegrationTests.cs` — testes do campo codigo

## Subtarefas

- [x] **Subtarefa 3.1**: Atualizar `TitularEndpoints` (GET `/titulares` aceita `codigo`)
- [x] **Subtarefa 3.2**: Atualizar `ObraEndpoints` (GET `/obras` aceita `codigo`)
- [x] **Subtarefa 3.3**: Atualizar `FonogramaEndpoints` (GET `/fonogramas` aceita `codigo`)
- [x] **Subtarefa 3.4**: Criar testes de integração (`CodigoIntegrationTests.cs`)
  - [x] GET /associacoes → todos com codigo 1-7
  - [x] POST /titulares → response contém `codigo` (long > 0)
  - [x] POST segundo titular → codigo incrementa (+1)
  - [x] GET /titulares?codigo=X → retorna exatamente 1
  - [x] GET /titulares?codigo=999999 → retorna lista vazia
  - [x] Depurar obra → nova obra tem codigo diferente (maior)
  - [x] Codigo nunca muda após edição (PUT)
- [x] 3.5 Verificar testes existentes passam (ajustar asserts se necessário para incluir campo codigo)
- [x] 3.6 `dotnet test`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test` — todos passam (existentes + novos)
- [ ] Mínimo 7 testes de integração para codigo
- [ ] Testes existentes adaptados para campo codigo nos responses
