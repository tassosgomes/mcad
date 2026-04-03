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

- [ ] 3.1 TitularEndpoints GET: +query param `codigo`, passar para TitularFiltro
- [ ] 3.2 ObraEndpoints GET: +query param `codigo`
- [ ] 3.3 FonogramaEndpoints GET: +query param `codigo`
- [ ] 3.4 Testes integração:
  - GET /associacoes → todos com codigo 1-7
  - POST /titulares → response contém `codigo` (long > 0)
  - POST segundo titular → codigo incrementa (+1)
  - GET /titulares?codigo=X → retorna exatamente 1
  - GET /titulares?codigo=999999 → retorna lista vazia
  - Depurar obra → nova obra tem codigo diferente (maior)
  - Codigo nunca muda após edição (PUT)
- [ ] 3.5 Verificar testes existentes passam (ajustar asserts se necessário para incluir campo codigo)
- [ ] 3.6 `dotnet test`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test` — todos passam (existentes + novos)
- [ ] Mínimo 7 testes de integração para codigo
- [ ] Testes existentes adaptados para campo codigo nos responses
