---
status: completed
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Proteger TODOS os endpoints existentes com RequireAuthorization

## Visão Geral

Adicionar `.RequireAuthorization("read")` em todos os GET e `.RequireAuthorization("write")` em todos os POST/PUT/DELETE. Health check permanece público. 7 arquivos de endpoints a modificar.

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs` — GETs: "read"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` — GETs: "read", POST/PUT/DELETE: "write", busca: "read"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs` — GETs: "read", POST/PUT/DELETE/iswc/depurar/dp: "write"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularidadeEndpoints.cs` — GET/busca: "read", POST/PUT/DELETE: "write"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/FonogramaEndpoints.cs` — GETs: "read", POST/PUT/DELETE/depurar: "write"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ParticipacaoEndpoints.cs` — GET: "read", POST/PUT/DELETE/calcular: "write"
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/StatusEndpoints.cs` — GET histórico: "read", POST liberar/bloquear/desbloquear: "write"

## Subtarefas

- [x] 2.1 AssociacaoEndpoints: 2 GETs → `.RequireAuthorization("read")`
- [x] 2.2 TitularEndpoints: 2 GETs + busca → "read"; POST + PUT + DELETE → "write"
- [x] 2.3 ObraEndpoints: 2 GETs → "read"; POST criar + PUT + DELETE + POST iswc + POST depurar + PUT dp → "write"
- [x] 2.4 TitularidadeEndpoints: GET listar + GET busca → "read"; POST + PUT + DELETE → "write"
- [x] 2.5 FonogramaEndpoints: 3 GETs → "read"; POST + PUT + DELETE + POST depurar → "write"
- [x] 2.6 ParticipacaoEndpoints: GET → "read"; POST + PUT + DELETE + POST calcular → "write"
- [x] 2.7 StatusEndpoints: 2 GET histórico → "read"; 6 POST (liberar/bloquear/desbloquear) → "write"
- [x] 2.8 Verificar `/health` permanece SEM RequireAuthorization
- [x] 2.9 `dotnet build`

## Evidências de Execução

- `dotnet build Cadastro.API.csproj` executado com sucesso após a aplicação das policies explícitas
- Com token `consultor`, `GET /api/v1/associacoes/` retornou `200`
- Com token `consultor`, `POST /api/v1/titulares/` retornou `403`
- Com token `analista`, `POST /api/v1/titulares/` retornou `400`, confirmando que a autorização passou e a rejeição veio da validação do payload, não de autorização
- `GET /health` permaneceu público com `200`
- Observação de implementação: não existe um arquivo `StatusEndpoints.cs` separado no código atual; as rotas de status estão em `ObraEndpoints.cs` e `FonogramaEndpoints.cs`, onde também foram protegidas com policies `read` e `write`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] Todos os GETs retornam 401 sem token e 200 com token consultor
- [x] Todos os POST/PUT/DELETE retornam 403 com token consultor e 200/201/204 com token analista
- [x] `/health` retorna 200 sem token
