# Plano — CADASTRO-2 Endpoint POST /api/v1/fonogramas/pendentes

> Data: 2026-06-19
> Origem: `tasks/identificacao/backlog.md`
> Escopo: corrigir o gap critico `[CADASTRO-2]` e alinhar Identificacao ao contrato do Cadastro para criacao de fonogramas.

## Contexto

O fluxo de criacao inline de fonograma pendente em Identificacao chama `POST /api/v1/fonogramas/pendentes`, mas esse endpoint nao existe no `cadastro-api`, gerando `404`.

A premissa original indicava `isrc` opcional. Essa premissa foi alterada: Cadastro e o dono da verdade de fonograma e o modelo atual do Cadastro exige ISRC para criar fonogramas. Portanto, Identificacao deve solicitar ISRC ao usuario e enviar esse campo como obrigatorio.

## Decisoes Propostas

1. Criar endpoint dedicado `POST /api/v1/fonogramas/pendentes`.
2. Criar `CriarFonogramaPendenteCommand` e handler no Application.
3. Manter `isrc` obrigatorio, seguindo o dominio atual do Cadastro.
4. Manter `obraId` obrigatorio e validar que a obra existe.
5. Criar fonograma com status cadastral inicial `PENDENTE_VALIDACAO`, que e o status inicial real do dominio para fonogramas ainda nao liberados.
6. Usar a permissao existente `cadastro:default:fonograma:criar`.
7. Atualizar o modal de Identificacao para exigir ISRC antes de enviar.

## Plano De Implementacao

### 1. Backend — Application

Arquivos previstos:

- `services/cadastro-api/2-Application/Cadastro.Application/Fonogramas/Commands/CriarFonogramaPendenteCommand.cs`

Implementar:

- record `CriarFonogramaPendenteCommand(string Isrc, Guid ObraId) : ICommand<FonogramaResponse>`
- validator com:
  - `Isrc` obrigatorio.
  - formato ISRC valido via regra atual do Cadastro.
  - `ObraId` obrigatorio.
- handler:
  - valida duplicidade de ISRC.
  - valida existencia da obra.
  - chama `Fonograma.Criar(...)`.
  - persiste via `IFonogramaRepository`.
  - publica auditoria como criacao de fonograma.
  - retorna `FonogramaResponse`.

### 2. Backend — API

Arquivo previsto:

- `services/cadastro-api/1-Services/Cadastro.API/Endpoints/FonogramaEndpoints.cs`

Implementar:

- request DTO especifico:

```csharp
public record CriarFonogramaPendenteRequest(string? Isrc, Guid ObraId);
```

- rota:

```http
POST /api/v1/fonogramas/pendentes
```

- resposta:
  - `201 Created`
  - `Location: /api/v1/fonogramas/{id}`
  - body `FonogramaResponse`, incluindo `status = "PENDENTE_VALIDACAO"`.
- autorizacao:
  - `RequireCadastroPermission(CadastroPermissions.FonogramaCriar)`.

### 3. Frontend — Identificacao

Arquivos previstos:

- `frontend/src/features/identificacao/captacoes/types/execucao.ts`
- `frontend/src/features/identificacao/captacoes/components/CriarFonogramaPendenteModal.tsx`

Implementar:

- alterar `CriarFonogramaPendenteRequest` para `isrc: string`.
- alterar modal para:
  - label `ISRC` sem "(Opcional)".
  - input `required`.
  - validar formato minimo antes do submit, preferencialmente reutilizando padrao existente de fonogramas do Cadastro se disponivel.
  - enviar `{ obraId, isrc }` sempre preenchido.

### 4. Testes Backend

Arquivo previsto:

- `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/FonogramaEndpointsTests.cs`

Adicionar casos:

1. `Post_CriarFonogramaPendente_ComPayloadValido_DeveRetornar201EPendenteValidacao`
   - request com `obraId` existente e `isrc` valido.
   - espera `201`.
   - body com `status = "PENDENTE_VALIDACAO"`.

2. `Post_CriarFonogramaPendente_SemIsrc_DeveRetornar400`
   - garante a nova premissa: ISRC obrigatorio.

3. `Post_CriarFonogramaPendente_ComIsrcInvalido_DeveRetornar400`
   - garante validacao do formato.

4. `Post_CriarFonogramaPendente_ComIsrcDuplicado_DeveRetornar409`
   - garante unicidade.

5. `Post_CriarFonogramaPendente_ComObraInexistente_DeveRetornar404`
   - garante validacao da obra vinculada.

## Validacao

Comandos previstos:

```bash
rtk dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj --filter Fonograma
rtk dotnet test services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj --filter FonogramaEndpointsTests
rtk dotnet build services/cadastro-api/Cadastro.sln
```

## Criterios De Aceite

- `POST /api/v1/fonogramas/pendentes` nao retorna mais `404`.
- Payload com `obraId` existente e `isrc` valido cria fonograma com `status = "PENDENTE_VALIDACAO"`.
- Payload sem `isrc` retorna `400`.
- Payload com `isrc` invalido retorna `400`.
- Payload com `isrc` duplicado retorna `409`.
- Payload com `obraId` inexistente retorna `404`.
- Modal `CriarFonogramaPendenteModal` exige ISRC antes de chamar a API.

## Fora De Escopo

- Permitir fonograma sem ISRC no Cadastro.
- Alterar o modelo de dominio `Fonograma` para aceitar `Isrc` nulo.
- Criar novo status `PENDENTE` para fonograma.
- Habilitar o botao "Criar Fonograma" do item `F02-1`.
- Atualizar seeds de Authz.
