# Especificação Técnica — Responsável amigável nas Captações

## Resumo Executivo

A solução resolve três problemas no domínio **Identificação** reaproveitando a projeção local `usuarios_identidade` (hoje apenas escrita pelo `IdentityUserEventConsumer`, sem nenhum caminho de leitura). Será criado um **read model EF** mapeado para a tabela já existente (sem nova migração de schema), com um repositório de leitura que serve aos três fluxos: (F1) um novo endpoint `GET /api/v1/analistas` que alimenta a combo do filtro; (F2) a resolução do nome do responsável no cadastro a partir da projeção; (F3) um endpoint de manutenção protegido para backfill idempotente.

A decisão arquitetural central é a **unificação do identificador**. O `Captacao.AnalistaResponsavelId` é um `Guid` derivado do `sub` do JWT via `new Guid(MD5(sub))` (em `UserContextExtensions.GetAnalistaId`), enquanto a projeção é chaveada pelo `logto_user_id` (string = `sub`). O filtro compara o `Guid` diretamente. Logo, combo, cadastro e backfill **precisam reproduzir exatamente essa conversão** — que não pode ser feita em SQL puro (`md5()::uuid`) porque o `Guid(byte[])` do .NET usa ordem de bytes mista (mixed-endian) nos primeiros componentes. A conversão será extraída para um helper de domínio puro e reutilizado por todos os caminhos, garantindo consistência.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **`AnalistaIdentificador` (novo, Domain)** — helper estático puro `FromSubject(string) : Guid` que centraliza a conversão `sub → Guid`. Passa a ser a única fonte da regra; `UserContextExtensions.GetAnalistaId` é refatorado para delegar a ele.
- **`UsuarioIdentidade` (novo, read model Domain/Infra)** — entidade EF mapeada à tabela existente `identificacao.usuarios_identidade` com `ExcludeFromMigrations()` (EF nunca gerencia seu schema). Campos relevantes: `LogtoUserId` (PK), `Username`, `DisplayName`, `Email`, `Roles`, `IsSuspended`, `DeletedAtUtc`.
- **`IUsuarioIdentidadeRepository` (novo, Domain) + impl (Infra)** — porta de leitura: `ListarAtivosAsync` (ordenado por nome), `ListarTodosAsync` (para backfill, inclui suspensos), `BuscarPorSubjectAsync`.
- **`ListarAnalistasQuery` + handler (novo, Application)** — projeta usuários ativos em `AnalistaResumoResponse { Id = FromSubject(logtoUserId), Nome }`.
- **`CriarCaptacaoCommandHandler` (alterado)** — passa a resolver o nome via repositório, com fallback para claim e, por último, `"Desconhecido"`.
- **`ReprocessarResponsaveisDesconhecidosCommand` + handler (novo, Application)** — backfill idempotente.
- **Frontend** — `useAnalistas` (hook cacheado), `getAnalistas` (api), `CaptacaoFilters` migra de `TextInput` (UUID) para `<Select>`.

Fluxo de dados: eventos `identity.user.*` → `usuarios_identidade` (já existe) → repositório de leitura → (combo / resolução de nome / backfill).

## Design de Implementação

### Interfaces Principais

```csharp
// 3-Domain — conversão única sub → Guid (substitui a lógica em UserContextExtensions)
public static class AnalistaIdentificador
{
    public static Guid FromSubject(string subject) =>
        Guid.TryParse(subject, out var g) ? g
            : new Guid(MD5.HashData(Encoding.UTF8.GetBytes(subject)));
}

// 3-Domain — porta de leitura da projeção
public interface IUsuarioIdentidadeRepository
{
    Task<IReadOnlyList<UsuarioIdentidade>> ListarAtivosAsync(CancellationToken ct);   // !suspenso && deletedAt==null
    Task<IReadOnlyList<UsuarioIdentidade>> ListarTodosAsync(CancellationToken ct);    // backfill (inclui suspensos)
    Task<UsuarioIdentidade?> BuscarPorSubjectAsync(string logtoUserId, CancellationToken ct);
}
```

### Modelos de Dados

- **`UsuarioIdentidade`** (read model): mapeado com `ToTable("usuarios_identidade", "identificacao", t => t.ExcludeFromMigrations())`. `Roles` mapeado como `jsonb` (lista de strings) — não usado nos filtros desta entrega (decisão: elegibilidade = qualquer ativo), mas mapeado para uso futuro. **Nenhuma migração de schema é criada.**
- **`AnalistaResumoResponse`** (reutilizado de `CaptacaoResponse.cs`): `{ Guid Id; string Nome; }`. É o contrato da combo.
- **`CriarCaptacaoCommand`** (alterado): adiciona `string AnalistaSubject` e troca a semântica de `AnalistaNome` para `string? AnalistaNomeClaim` (nome vindo do token, pode ser nulo).
- **Nome de exibição**: cadeia de fallback `DisplayName ?? Username ?? Email ?? LogtoUserId`.
- **`Captacao`** (alterado): novo método de domínio `ReatribuirNomeResponsavel(string nome)` — única forma de alterar `AnalistaResponsavelNome` (mantém o `Id` imutável; usado apenas pelo backfill).

### Endpoints de API

| Método e caminho | Descrição | Resp. |
|---|---|---|
| `GET /api/v1/analistas` | Lista usuários ativos da projeção como candidatos a responsável. | `AnalistaResumoResponse[]` |
| `POST /api/v1/captacoes/manutencao/reprocessar-responsaveis` | Backfill idempotente de captações com nome `"Desconhecido"`. **Admin-only.** | `{ totalAnalisadas, totalCorrigidas }` |
| `GET /api/v1/captacoes?analistaResponsavelId={guid}` | **Inalterado** — filtro reutilizado; o `{guid}` agora vem da combo. | — |
| `POST /api/v1/captacoes` | **Inalterado no contrato**; muda só a resolução interna do nome. | `CaptacaoResponse` |

`GET /api/v1/analistas` é registrado no mesmo pipeline autenticado dos demais endpoints (segue padrão `/api/v1/...`). O `POST .../manutencao/...` exige autorização administrativa (ver Riscos).

### Detalhe dos fluxos

**F1 — Combo.** `ListarAnalistasQuery` → handler chama `ListarAtivosAsync`, mapeia para `AnalistaResumoResponse` (`Id = AnalistaIdentificador.FromSubject(u.LogtoUserId)`), ordenado por nome. Frontend: `getAnalistas()` em `captacoesApi.ts` (`apiGetIden('/analistas')`), hook `useAnalistas()` (`staleTime: Infinity`, `gcTime: 1h`, igual `useRubricas`). Em `CaptacaoFilters.tsx`, o `FormField "Responsável (ID)"` + `TextInput` + `useDebounce` são substituídos por `<Select>` com `options = [{value:'',label:'Todos'}, ...analistas.map(a => ({value:a.id, label:a.nome}))]`; `onChange` chama `handleChange('analistaResponsavelId', val)`. Rótulo passa a `"Responsável"`. Como o `value` enviado é o mesmo `Guid` armazenado na captação, o filtro existente casa sem alterações no backend.

**F2 — Nome no cadastro.** `UserContextExtensions` ganha `GetAnalistaSubject()` (retorna `sub`) e `GetAnalistaNomeClaim()` (retorna `name`/`username` **ou `null`** — remove o default `"Desconhecido"` daqui). O endpoint `POST /captacoes` monta o command com `AnalistaId`, `AnalistaSubject`, `AnalistaNomeClaim`. O handler resolve: `nome = (await repo.BuscarPorSubjectAsync(subject))?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido"` e chama `Captacao.Criar(..., cmd.AnalistaId, nome)`. O `"Desconhecido"` passa a ser último recurso real.

**F3 — Backfill.** Handler carrega captações com `AnalistaResponsavelNome == "Desconhecido"`; carrega `ListarTodosAsync` e monta dicionário `Guid → NomeExibicao` via `FromSubject(logtoUserId)`; para cada captação cujo `AnalistaResponsavelId` exista no dicionário, chama `ReatribuirNomeResponsavel(nome)` e persiste; retorna contagens. Idempotente: só toca linhas com nome `"Desconhecido"`, então reexecuções não reprocessam o que já foi corrigido. Inclui suspensos (usa `ListarTodosAsync`) para recuperar histórico de responsáveis hoje inativos.

## Pontos de Integração

Nenhuma integração externa nova. A fonte de usuários é a projeção local já alimentada por RabbitMQ (`identity.events` / `identity.user.*`). Não há chamada síncrona a serviço de identidade em tempo de requisição (atende restrição do PRD). Repositório e query novos são registrados automaticamente pelo Scrutor (`IQueryHandler<,>` / `ICommandHandler<,>`); o `IUsuarioIdentidadeRepository` precisa de registro DI explícito junto aos demais repositórios em `Program.cs`.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação |
|---|---|---|---|
| `usuarios_identidade` (tabela) | Novo read model EF (sem schema change) | Mapeada com `ExcludeFromMigrations()`. Baixo risco. | Garantir mapeamento; sem migração |
| `UserContextExtensions` | Refactor | `GetAnalistaId` delega a `AnalistaIdentificador`; novos `GetAnalistaSubject`/`GetAnalistaNomeClaim`; `"Desconhecido"` sai daqui. Baixo. | Atualizar chamadas |
| `CriarCaptacaoCommand` / handler | Mudança de contrato interno | Novos campos no command; injeção do repositório. Médio (toca caminho de criação). | Ajustar endpoint + testes |
| `Captacao` (entidade) | Novo método de domínio | `ReatribuirNomeResponsavel`. Baixo (usado só no backfill). | Cobrir com teste |
| `GET /api/v1/captacoes` | Inalterado | Filtro reutilizado. Nenhum. | — |
| Frontend `CaptacaoFilters` | Mudança de UI | `TextInput` UUID → `<Select>`; novo hook/api. Baixo. | Atualizar componente |
| `Program.cs` (DI) | Registro | Registrar `IUsuarioIdentidadeRepository`; mapear entidade no DbContext. Baixo. | Configurar |

## Abordagem de Testes

### Testes Unitários
- `AnalistaIdentificador.FromSubject`: determinismo; UUID válido é preservado; **igualdade com o `Guid` que `GetAnalistaId` produzia** (garante casamento com dados existentes).
- `ListarAnalistasQueryHandler`: filtra inativos/suspensos, ordena por nome, aplica cadeia de fallback do nome, calcula `Id` via `FromSubject`.
- `CriarCaptacaoCommandHandler`: (a) projeção encontrada → usa `DisplayName`; (b) sem projeção, com claim → usa claim; (c) sem nada → `"Desconhecido"`.
- Backfill handler: corrige só `"Desconhecido"` com ID casável; ignora sem correspondência; idempotência (2ª execução = 0 corrigidas); resolve responsável suspenso.

### Testes de Integração (Testcontainers PostgreSQL)
- Seed em `usuarios_identidade` + captações: `GET /api/v1/analistas` retorna apenas ativos, ordenados, com `Id` casável.
- Fim-a-fim do filtro: criar captação (nome resolvido) → `GET /captacoes?analistaResponsavelId={id-da-combo}` retorna a captação.
- `POST .../reprocessar-responsaveis`: atualiza só linhas `"Desconhecido"`, retorna contagem, idempotente; valida autorização (sem papel admin → 403).

## Sequenciamento de Desenvolvimento

### Ordem de Construção
1. **`AnalistaIdentificador`** + refactor de `UserContextExtensions` (base de tudo; sem isso o casamento de IDs não é confiável).
2. **Read model `UsuarioIdentidade`** + mapeamento `ExcludeFromMigrations` + `IUsuarioIdentidadeRepository`/impl + DI.
3. **F1** query/endpoint `GET /analistas` + frontend (combo).
4. **F2** alteração do command/handler/endpoint de criação.
5. **F3** método de domínio + command/handler + endpoint de manutenção.
6. Testes unitários e de integração ao longo de cada etapa.

### Dependências Técnicas
- PostgreSQL com a tabela `usuarios_identidade` populada (consumer ativo) para validação realista.
- Definição da política/papel de autorização administrativa para o endpoint de manutenção.

## Monitoramento e Observabilidade

- Backfill: log estruturado (Information) com `totalAnalisadas` e `totalCorrigidas`; Warning por captação com ID sem correspondência (amostrado). Segue o logging existente do serviço.
- `GET /analistas`: log padrão de request; sem métrica nova dedicada (lista pequena, cacheada no cliente).
- Cadastro: manter o log atual; opcionalmente um Debug quando o nome cair em `"Desconhecido"` (sinaliza projeção desatualizada).

## Considerações Técnicas

### Decisões Principais
- **Conversão `sub→Guid` centralizada em domínio** em vez de duplicar a regra: garante que combo, filtro, cadastro e backfill apontem para o mesmo usuário. Rejeitado fazer o casamento em SQL (`md5()::uuid`) por incompatibilidade de endianness com `Guid(byte[])` do .NET.
- **Read model com `ExcludeFromMigrations()`** em vez de transformar a tabela em entidade gerenciada: evita conflito com a migração `20260511120000` que já cria a tabela e mantém a projeção sob responsabilidade do consumer.
- **Combo via `<Select>` com carga única cacheada** (decisão do usuário): consistente com `useRubricas` e com os filtros de Rubrica/Status; sem busca server-side.
- **Elegibilidade = qualquer usuário ativo** (decisão do usuário): elimina a dependência de conhecer o valor exato do papel; `Roles` fica mapeado para refinamento futuro.
- **Backfill por endpoint protegido** (decisão do usuário): controlável, idempotente, seguro com múltiplas réplicas; evita re-execução automática a cada deploy.

### Riscos Conhecidos
- **Autorização do endpoint de manutenção**: o serviço usa o toggle `AUTH_ENABLED`; é preciso definir o papel/política admin (ex.: papel administrativo de Identificação). Mitigação: exigir papel específico via `RequireAuthorization` e cobrir com teste 403. *Follow-up de stakeholder.*
- **Premissa `sub == logto_user_id`**: implícita no contrato Logto, não validada em código. Se divergir, combo/backfill não casam. Mitigação: teste de integração com dado real e log de divergência.
- **Captações com responsável fora da projeção** (usuário nunca sincronizado): permanecem `"Desconhecido"` — comportamento esperado (RF-14).

### Conformidade com Padrões
- **dotnet-architecture**: respeita camadas numeradas (helper/entidade/porta em Domain, handlers em Application, repositório/EF em Infra, endpoints em Services) e CQRS nativo via `IDispatcher`.
- **restful-api**: rotas `/api/v1/...`, plural, em português; reuso do filtro existente.
- **react-architecture/code-quality**: hook em `hooks/`, api em `api/`, aliases `@components`/`@hooks`; `<Select>` tipado.
- **dotnet-testing/java-testing-equivalente**: xUnit + Testcontainers para integração; AAA nos unitários.
- **Privacidade**: a combo expõe apenas nome de analistas ativos a usuários já autorizados na tela.
