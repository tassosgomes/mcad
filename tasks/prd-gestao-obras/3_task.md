---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>external_apis</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 3.0: Infra — IswcService (HttpClient + Polly) + Exceptions

## Relacionada às User Stories

- [HU-02] Obter ISWC via API (direta — integração externa)

## Visão Geral

Implementar `IswcService` que chama `POST https://iswc.tasso.dev.br/` via HttpClient com Polly (retry 2x, timeout 10s). Criar exceptions: `ExternalServiceException` (→502) e `DepuracaoNecessariaException` (→409 com code).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/ExternalServices/IswcService.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/ExternalServiceException.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/DepuracaoNecessariaException.cs`
- **Referência:**
  - `tasks/prd-gestao-obras/techspec.md` (seção "IswcService")
  - `tasks/prd-gestao-obras/prd.md` (seção "Integração Externa" — request/response)
- **Skills:** `dotnet-dependency-config` — HttpClient, Polly

## Subtarefas

- [ ] 3.1 Criar `ExternalServiceException` (mensagem amigável → 502)
- [ ] 3.2 Criar `DepuracaoNecessariaException` (com property `Code = "DEPURACAO_NECESSARIA"` → 409)
- [ ] 3.3 Criar `IswcService` implementando `IIswcService`: POST JSON, deserializar response, tratar timeout/erro como ExternalServiceException
- [ ] 3.4 Instalar pacote Polly se necessário: `Microsoft.Extensions.Http.Polly`
- [ ] 3.5 Verificar build: `dotnet build`

## Detalhes de Implementação

### Request à API ISWC
```json
POST https://iswc.tasso.dev.br/
{ "association_code": "ABRAMUS", "work_title": "Meu Bem Querer", "authors": ["Djavan"] }
```

### Response
```json
{ "iswc": "T-336305833-4", "work_title": "...", "authors": [...], "association_code": "...", "created_at": "..." }
```

### HttpClient com Polly (registrado em Program.cs na task 7.0)
```csharp
builder.Services.AddHttpClient<IIswcService, IswcService>(client =>
{
    client.BaseAddress = new Uri("https://iswc.tasso.dev.br/");
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] IswcService envia POST com Content-Type application/json
- [ ] Timeout de 10s configurado
- [ ] Retry 2x em erros transientes
- [ ] ExternalServiceException lançada para erros/timeout
