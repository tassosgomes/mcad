---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0"]
---

<task_context>
<domain>backend/api+testing</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: API — ParticipacaoEndpoints (5 endpoints) + Program.cs + Testes

## Visão Geral

5 endpoints sub-resource de fonogramas, registro DI, e testes unitários (CalculadoraConexos paramétrico + handlers) + integração (todos os endpoints).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ParticipacaoEndpoints.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/ParticipacaoConexaTests.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/CalculadoraConexosTests.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/AdicionarParticipacaoHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/AjustarPercentualHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/CalcularPercentuaisHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Participacoes/RemoverParticipacaoHandlerTests.cs`
  - `5-Tests/Cadastro.IntegrationTests/ParticipacaoEndpointsTests.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar IParticipacaoRepository, MapParticipacaoEndpoints()
- **Referência:**
  - `tasks/prd-participacao-conexa/api-contract.yaml`
  - `1-Services/.../Endpoints/TitularidadeEndpoints.cs` (padrão sub-resource)

## Subtarefas

- [ ] 7.1 Criar `ParticipacaoEndpoints` — MapGroup `/api/v1/fonogramas/{fonogramaId:guid}/participacoes`: GET, POST, PUT/{id}, DELETE/{id}, POST/calcular
- [ ] 7.2 GET → ListarParticipacoesQuery
- [ ] 7.3 POST → AdicionarParticipacaoCommand → 201
- [ ] 7.4 PUT/{id} → AjustarPercentualCommand → 200
- [ ] 7.5 DELETE/{id} → RemoverParticipacaoCommand → 200 com body
- [ ] 7.6 POST/calcular → CalcularPercentuaisCommand → 200
- [ ] 7.7 Program.cs: registrar IParticipacaoRepository, MapParticipacaoEndpoints()
- [ ] 7.8 **CalculadoraConexosTests (CRÍTICO)** — testes paramétricos: padrão com músico, sem músico, dueto, 3 músicos arredondamento, 4 músicos, 3 intérpretes, one-man-band, sem intérprete, sem produtor. **Verificar soma total = 100.0000m em TODOS os cenários.**
- [ ] 7.9 ParticipacaoConexaTests: Criar, DefinirPercentual, AjustarManual intérprete ok, AjustarManual músico rejeita, Editavel
- [ ] 7.10 Handler tests: Adicionar (ok, duplicata, LIBERADO), Ajustar (ok, músico 422, LIBERADO), Calcular (ok, composição incompleta, LIBERADO), Remover (ok, LIBERADO)
- [ ] 7.11 Integração: POST add 201, POST add duplicata 409, POST add LIBERADO 409, POST calcular 200 soma=100%, POST calcular sem intérprete 422, PUT ajustar intérprete 200, PUT ajustar músico 422, DELETE 200 desatualizado, GET listar 200

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test` — todos passam
- [ ] CalculadoraConexosTests: mínimo 9 cenários paramétricos, TODOS com assert soma=100.0000m
- [ ] Mínimo 15 testes unitários + 10 integração
