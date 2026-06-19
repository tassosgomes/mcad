# Plano — CADASTRO-1 Endpoint POST /api/v1/obras/pendentes

> Data: 2026-06-18
> Origem: `tasks/identificacao/backlog.md`
> Escopo: corrigir o gap critico `[CADASTRO-1]` e equiparar as opcoes de `tipoObra` entre Identificacao frontend e Cadastro API.

## Contexto

O fluxo de criacao inline de obra pendente em Identificacao chama `POST /api/v1/obras/pendentes`, mas esse endpoint nao existe no `cadastro-api`, gerando `404`.

O `cadastro-api` ja possui `POST /api/v1/obras`, e a entidade `ObraMusical.Criar(...)` ja cria obras com status `PENDENTE`. Portanto, a correcao deve criar um contrato dedicado para o fluxo de Identificacao sem duplicar regra de dominio.

Tambem ha divergencia nas opcoes do modal `CriarObraPendenteModal`:

- Cadastro aceita: `MUSICAL`, `LITEROMUSICAL`, `VERSAO`, `POT_POURRI`.
- Frontend atual exibe/envia: `MUSICAL`, `DRAMATICO_MUSICAL`, `LITERARIA`, `AUDIOVISUAL`.

## Decisoes Propostas

1. Criar endpoint dedicado `POST /api/v1/obras/pendentes`.
2. Criar `CriarObraPendenteCommand` e handler no Application, mantendo a regra de criacao no dominio.
3. Usar a permissao existente `cadastro:default:obra:criar`.
4. Padronizar o contrato principal do novo endpoint como:

```json
{
  "titulo": "Meu Bem Querer",
  "tipoObra": "MUSICAL"
}
```

5. Aceitar temporariamente `tipo` como alias de compatibilidade para o frontend ja existente:

```json
{
  "titulo": "Meu Bem Querer",
  "tipo": "MUSICAL"
}
```

6. Atualizar o frontend para enviar `tipoObra`, removendo a dependencia do alias no caminho feliz.
7. Equiparar o select do modal para exibir somente os valores aceitos pelo Cadastro:

- `MUSICAL` — Musical
- `LITEROMUSICAL` — Literomusical
- `VERSAO` — Versao
- `POT_POURRI` — Pot-pourri

## Plano De Implementacao

### 1. Backend — Application

Arquivos previstos:

- `services/cadastro-api/2-Application/Cadastro.Application/Obras/Commands/CriarObraPendenteCommand.cs`

Implementar:

- record `CriarObraPendenteCommand(string Titulo, string TipoObra) : ICommand<ObraResponse>`
- validator com:
  - `Titulo` obrigatorio e tamanho maximo atual.
  - `TipoObra` obrigatorio.
  - parse aceitando os enums existentes do Cadastro.
- handler:
  - normaliza `TipoObra`.
  - chama `ObraMusical.Criar(...)`.
  - persiste via `IObraRepository`.
  - publica auditoria como criacao de obra.
  - retorna `ObraResponse`.

### 2. Backend — API

Arquivo previsto:

- `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs`

Implementar:

- request DTO especifico para o endpoint, por exemplo:

```csharp
public record CriarObraPendenteRequest(string Titulo, string? TipoObra, string? Tipo);
```

- rota:

```http
POST /api/v1/obras/pendentes
```

- resolucao de tipo:
  - `tipoObra` tem prioridade.
  - `tipo` e aceito como alias temporario.
  - se ambos ausentes, retornar erro de validacao.
- resposta:
  - `201 Created`
  - `Location: /api/v1/obras/{id}`
  - body `ObraResponse`, incluindo `status = "PENDENTE"`.
- autorizacao:
  - `RequireCadastroPermission(CadastroPermissions.ObraCriar)`.

### 3. Frontend — Identificacao

Arquivos previstos:

- `frontend/src/features/identificacao/captacoes/types/execucao.ts`
- `frontend/src/features/identificacao/captacoes/components/CriarObraPendenteModal.tsx`

Implementar:

- alterar `CriarObraPendenteRequest` de:

```ts
{
  titulo: string;
  tipo: string;
}
```

para:

```ts
{
  titulo: string;
  tipoObra: 'MUSICAL' | 'LITEROMUSICAL' | 'VERSAO' | 'POT_POURRI';
}
```

- alterar submit do modal para enviar `{ titulo, tipoObra }`.
- substituir as opcoes divergentes do select pelas opcoes aceitas pelo Cadastro.

### 4. Testes Backend

Arquivo previsto:

- `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/ObraEndpointsTests.cs`

Adicionar casos:

1. `Post_CriarObraPendente_ComPayloadValido_DeveRetornar201EPendente`
   - request com `titulo` e `tipoObra`.
   - espera `201`.
   - body com `status = "PENDENTE"`.
   - body com `tipo` normalizado conforme API atual.

2. `Post_CriarObraPendente_ComTipoAlias_DeveRetornar201`
   - request com `titulo` e `tipo`.
   - garante compatibilidade temporaria.

3. `Post_CriarObraPendente_SemTitulo_DeveRetornar400`
   - garante validacao de titulo obrigatorio.

4. `Post_CriarObraPendente_ComTipoInvalido_DeveRetornar400`
   - garante rejeicao das opcoes antigas divergentes, por exemplo `AUDIOVISUAL`.

### 5. Validacao

Comandos previstos:

```bash
rtk dotnet test services/cadastro-api/Cadastro.sln --filter ObraEndpointsTests
```

Se houver falha por dependencias compartilhadas ou ambiente, executar o projeto de testes especifico:

```bash
rtk dotnet test services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj --filter ObraEndpointsTests
```

## Custo Estimado

### Tamanho

Baixo a moderado.

Estimativa de alteracao:

- Backend Application: 1 arquivo novo.
- Backend API: 1 arquivo alterado.
- Backend testes: 1 arquivo alterado.
- Frontend Identificacao: 2 arquivos alterados.

Total previsto: 5 arquivos tocados, sendo 1 novo.

### Tempo

Estimativa:

- Implementacao backend: 30 a 45 min.
- Testes backend: 20 a 30 min.
- Ajuste frontend das opcoes e payload: 10 a 20 min.
- Validacao local e pequenos ajustes: 20 a 40 min.

Total: aproximadamente 1h20 a 2h15.

### Risco

Baixo.

Principais riscos:

- O alias temporario `tipo` pode mascarar clientes antigos. Mitigacao: frontend passa a enviar `tipoObra` e o alias fica restrito ao endpoint novo.
- A mudanca de opcoes do modal pode surpreender usuarios que viam categorias inexistentes no Cadastro. Mitigacao: alinhar visualmente as opcoes ao dominio oficial do Cadastro.
- Os testes de integracao podem depender do estado do ambiente Docker/PostgreSQL. Mitigacao: usar os testes existentes do `CadastroApiFactory`.

## Criterios De Aceite

- `POST /api/v1/obras/pendentes` nao retorna mais `404`.
- Payload com `titulo` e `tipoObra` valido cria obra com `status = "PENDENTE"`.
- Payload com `tipo` legado continua funcionando temporariamente.
- Payload sem `titulo` retorna `400`.
- Payload com tipo invalido retorna `400`.
- Modal `CriarObraPendenteModal` exibe apenas as opcoes aceitas pelo Cadastro.
- Frontend envia `tipoObra`, nao `tipo`, no caminho principal.

## Fora De Escopo

- Implementar `CADASTRO-2` para fonogramas pendentes.
- Alterar enum de `TipoObra` no Cadastro.
- Criar nova permissao especifica para obras pendentes.
- Atualizar seeds de Authz.
- Remover o alias `tipo` no mesmo ciclo.
