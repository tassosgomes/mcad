---
status: completed
parallelizable: false
blocked_by: ["4.0", "5.0", "6.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: API — ObraEndpoints (8 endpoints) + Program.cs + GlobalExceptionHandler

## Visão Geral

Criar os 8 endpoints (CRUD + /iswc + /depurar + /dominio-publico), registrar DI (IObraRepository, IIswcService com HttpClient+Polly), e estender GlobalExceptionHandler com ExternalServiceException→502 e DepuracaoNecessariaException→409+code.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar IObraRepository, HttpClient<IIswcService> com Polly, MapObraEndpoints()
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — adicionar ExternalServiceException→502, DepuracaoNecessariaException→409 com `code` no ProblemDetails
- **Referência:**
  - `tasks/prd-gestao-obras/api-contract.yaml`
  - `1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` (padrão)
- **Skills:** `dotnet-architecture` — Minimal API; `common/restful-api` — sub-resources

## Subtarefas

- [ ] 7.1 Criar `ObraEndpoints` com MapGroup("/api/v1/obras")
- [ ] 7.2 GET / — listar paginado (query params → ObraFiltro → ListarObrasQuery)
- [ ] 7.3 POST / — criar obra → 201 + Location
- [ ] 7.4 GET /{id} — buscar por ID
- [ ] 7.5 PUT /{id} — atualizar (pode retornar 409 DEPURACAO_NECESSARIA)
- [ ] 7.6 DELETE /{id} — excluir
- [ ] 7.7 POST /{id}/iswc — obter ISWC → 200 ou 422/502
- [ ] 7.8 POST /{id}/depurar — depurar → 201 DepuracaoResponse + Location
- [ ] 7.9 PUT /{id}/dominio-publico — toggle DP
- [ ] 7.10 Atualizar GlobalExceptionHandler: ExternalServiceException→502, DepuracaoNecessariaException→409 (incluir `code` no ProblemDetails extensions)
- [ ] 7.11 Atualizar Program.cs: DI + HttpClient + Polly + MapObraEndpoints

## Detalhes de Implementação

### GlobalExceptionHandler — DepuracaoNecessariaException com code
```csharp
DepuracaoNecessariaException ex => (409, "Depuração Necessária"),
// + adicionar ao ProblemDetails: Extensions["code"] = ex.Code
```

### Program.cs — HttpClient + Polly
```csharp
builder.Services.AddHttpClient<IIswcService, IswcService>(client =>
{
    client.BaseAddress = new Uri("https://iswc.tasso.dev.br/");
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet run` inicia sem erros
- [ ] `POST /api/v1/obras` → 201 (PENDENTE)
- [ ] `PUT /api/v1/obras/{id}` em obra LIBERADA com título diferente → 409 com `code: "DEPURACAO_NECESSARIA"`
- [ ] `POST /api/v1/obras/{id}/depurar` → 201 com obraDepurada + novaObra
- [ ] `POST /api/v1/obras/{id}/iswc` sem titulares → 422
- [ ] `PUT /api/v1/obras/{id}/dominio-publico` → 200
- [ ] `DELETE /api/v1/obras/{id}` DEPURADA → 409
