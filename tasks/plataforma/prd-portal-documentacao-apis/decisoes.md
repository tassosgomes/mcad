# Portal de Documentação de APIs (síncronas e assíncronas) — Decisões

> Documento de decisão. Registra o que foi acordado na discussão de **2026-06-16** antes de iniciar a implementação.
> Status: **Fase 1 concluída (2026-06-17); Fase 2 a iniciar**.

## Estado da execução

- **Fase 1 — concluída.** Todos os 4 serviços expõem OpenAPI; AsyncAPI coberto para os 4
  (Saunter nos .NET, handwritten nos Java). Contratos materializados e versionados em
  `contracts/` (ver `contracts/README.md`). Script `scripts/export-contracts.sh` gera os
  specs (curl dos serviços locais) com modo `--check` de drift — validado de ponta a ponta.
  - .NET: adicionado canal `identificacao.rol.cancelado` que faltava no Saunter.
  - Java: adicionado `springdoc-openapi` em arrecadacao e distribuicao.
  - Achados de divergência código × `docs/events.md` registrados (ver abaixo); destaque para
    o provável bug do `verba.disponivel` (`valorBrutoTotal` no produtor × `valorBruto` no
    consumidor de Distribuição).
- **Fase 2 — em andamento (decisão revista 2026-06-17).** **EventCatalog foi descartado**:
  seus generators de OpenAPI/AsyncAPI são plugins **comerciais** (exigem license key da
  EventCatalog Cloud; gratuitos só para projetos OSS, e ainda assim com key). Decisão: usar a
  **própria UI do Microcks como portal** (Apache-2.0, sem key) — ela navega os specs
  importados e ainda entrega mock + contract testing. Microcks passa a ser o único componente
  da Fase 2 (portal + mock + testes). Host previsto: `mcad-docs` ou `mcad-mocks.tasso.dev.br`.
  - **Fase 2a (core) — feita.** Protótipo local validado (`infra/microcks/docker-compose.yml`,
    Keycloak off): os 8 contratos importam → 4 serviços REST + 4 EVENT; portal navegável.
    Stack de Swarm escrito (`microcks-stack.yml`): Keycloak por path `/auth` no mesmo host,
    realm via template + `render-realm.sh` (secrets fora do git), Traefik/`cloudflare-resolver`,
    `.env` dedicado (`infra/microcks/.env.microcks`). Realm de prod validado no KC26 (importa;
    client `microcks-automation` retorna token com role `manager`). Import via
    `scripts/import-contracts-microcks.sh`. Host previsto: `mcad-docs.tasso.dev.br`.
  - **Fase 2a — DEPLOYADA em produção (2026-06-17).** Stack Portainer `mcad-microcks`
    (Id=32) no Swarm; `https://mcad-docs.tasso.dev.br` (UI) + `/auth` (Keycloak). 8 contratos
    importados (4 REST + 4 EVENT). Realm entregue como **Swarm config externa** `microcks_realm`
    (criada via SSH a partir do realm renderizado) — deploy via Portainer não usa arquivos do repo.
    `KC_HOSTNAME` precisou incluir `/auth` para o issuer casar. Secrets em
    `infra/microcks/.env.microcks` (local/gitignored). Keycloak em `start-dev` (H2, realm
    reimportado a cada restart).
  - **Fase 2b (async mock) — VALIDADA local; Swarm pronto p/ deploy (2026-06-17).**
    Stack: **Kafka KRaft single-node** (bus interno, sem Zookeeper) + **LavinMQ 2.8.1**
    (alvo AMQP, drop-in RabbitMQ leve, interno à stack) + **async-minion 1.14.0**. Escolha
    do LavinMQ porque o **CloudAMQP do mcad não permite vhost dedicado** p/ mocks — então
    sobe broker próprio na stack. Provado ponta-a-ponta no compose local: evento real
    `arrecadacao.pagamento.registrado` (CloudEvents) mockado → LavinMQ → consumido com payload
    realista. Espelhado no `microcks-stack.yml` (config do minion via Swarm config externa
    `microcks_minion_props`; ver `infra/microcks/README.md` p/ deploy). Caveats achados:
    (a) Microcks **nomeia a exchange `{serviço}-{versão}-{operação}`**, ignora `exchange.name`
    do spec → consumidor binda nessa; (b) **binding via `$ref` não é resolvido** pelo Microcks
    (erra `type null`) → cadastro/identificacao (Saunter) precisam de binding **inline**;
    (c) Java (arrecadacao/distribuicao) têm binding inline ok mas faltam `examples:` de
    mensagem. **Pendente:** deploy em prod (Portainer); cobertura dos demais eventos; fix
    Saunter inline; consumo cross-stack mcad↔LavinMQ.
  - **Fase 2b — DEPLOYADA em produção (2026-06-17).** Stack `mcad-microcks` (Id=32)
    ganhou `kafka` + `lavinmq` + `async-minion`. Validado ponta-a-ponta em prod: mock
    `arrecadacao.pagamento.registrado` publicado no LavinMQ e **consumido** (via container
    curl efêmero na rede `mcad-microcks_microcks-internal`). Gotchas do deploy no Swarm:
    (a) **Kafka KRaft não resolve o próprio nome de serviço** no overlay (VIP) no boot →
    `KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093` (advertised segue `kafka:19092`);
    (b) com Keycloak ON, o **minion precisa de service account** — reusado o client
    `microcks-automation`, mas ele só tinha role `manager` e o endpoint do minion exige
    **`user`** (roles do Microcks não são hierárquicas) → adicionado `user` ao SA no realm
    (config Swarm `microcks_realm_v2`); secret do SA injetado via env
    `MICROCKS_SERVICEACCOUNT_CREDENTIALS` (não no arquivo commitado). LavinMQ interno
    (sem porta publicada). **Pendente:** demais exemplos; fix Saunter inline; consumo
    cross-stack mcad↔LavinMQ.
  - **Caveat**: mocks retornam vazio sem exemplos nos specs.
  - **Mock async .NET (fix Saunter inline) — FEITO e VALIDADO local (2026-06-18).** Os 2
    serviços .NET (cadastro=8 eventos, identificacao=2) passam a ter mock async funcional,
    fechando 4/4 serviços com mock async. Pós-processador `scripts/normalize-asyncapi.py`
    (chamado pelo `export-contracts.sh`, write+check) torna o Saunter "Microcks-ready":
    (a) **inline do binding AMQP** (Saunter emite `$ref`, que o async-minion não resolve →
    `type null`); (b) **merge de exemplos CloudEvents** dos sidecars
    `contracts/<svc>/async-examples.yaml` (mantém o spec gerado limpo, como o `examples.yaml`
    do REST). **Validado ponta-a-ponta no stack async local** (kafka+lavinmq+async-minion):
    as 10 exchanges .NET foram criadas e o evento `cadastro.titular.criado` foi publicado e
    **consumido** com payload realista. **Gotcha decisivo:** o Microcks deriva o nome da
    exchange AMQP do **título** do AsyncAPI; o título do Saunter tinha em-dash/acento
    (`Cadastro API — Eventos Assíncronos`) → exchange inválida → `java.io.IOException` no
    publish. Fix: título **ASCII-only** no `AsyncApiExtensions.cs` dos 2 serviços
    (`Cadastro API Eventos Assincronos` / `Identificacao API Eventos Assincronos`).
    **Pendente:** redeploy dos 2 serviços .NET em prod (para o título ASCII valer) + reimport;
    consumo cross-stack mcad↔LavinMQ.
  - **Mocks úteis — INICIADO (2026-06-17, caminho B).** Overlay de exemplos `APIExamples`
    como artefato secundário (`contracts/<svc>/examples.yaml`), mesclado sobre o OpenAPI sem
    sujar o spec gerado. Protótipo em `contracts/arrecadacao/examples.yaml` (GET lista + GET por
    id com dispatch) **validado em prod**: mocks respondem dados reais. `import-contracts-microcks.sh`
    auto-descobre e sobe os overlays como secundários. Expandir endpoint a endpoint conforme valor.
  - **Mocks úteis — EXPANDIDO para os 4 serviços (2026-06-18).** Overlays criados/expandidos
    cobrindo as famílias de recursos centrais (lista + get-by-id), 28 operações no total:
    cadastro (titulares, obras, fonogramas, associacoes), identificacao (captacoes, rubricas,
    tipos-utilizacao, usuarios-musica), distribuicao (processos, rubricas, ajustes-estorno),
    arrecadacao (+ licencas, pagamentos, usuarios-musica, verbas além das rubricas). **Validado
    ponta-a-ponta no Microcks local** (compose, Keycloak off): import OK + curl nos mocks retorna
    dados reais com dispatch correto no get-by-id. Caveats achados: (a) os OpenAPI .NET
    (cadastro/identificacao) declaram respostas 200 **sem schema** → corpos inferidos dos DTOs
    reais do código; (b) envelopes de lista divergem entre serviços (cadastro `{data,pagination}`,
    arrecadacao `{items,metadata}`, distribuicao `{items,totalElements,totalPages}`, e até
    dentro do mesmo serviço: identificacao usa `data` em captacoes e `items` em usuarios-musica);
    (c) nome de serviço acentuado (`Identificação API`) exige **percent-encoding** na URL do mock.
    **Pendente:** demais endpoints conforme valor; reimport em prod (segue no merge para main).
- **Fase 3 — drift-gate FEITO (2026-06-17).** `scripts/check-contracts-drift.sh` orquestra
  boot dos 4 serviços (infra local) + `export-contracts.sh --check` — **validado localmente**
  (exit 0, contratos em dia). Workflow `.github/workflows/contracts-drift.yml` (PR/push em
  `services/**`/`contracts/**`): sobe Postgres+RabbitMQ, setup Java 21 + .NET (global.json) +
  settings.xml do GitHub Packages, roda o gate. Não-required ainda (calibrar 1ª execução no
  GH, como o pipeline shadow v2). **Pendente:** reimport automático no Microcks pós-merge +
  contract tests; opcionalmente migrar o gate para testes por serviço (`mvn test`/`dotnet
  test`) que já têm a infra de auth/SDK resolvida.
- **Fase 3+ — reimport automático FEITO (2026-06-17).** Workflow
  `.github/workflows/contracts-reimport.yml`: em push para main tocando `contracts/`,
  reimporta no Microcks de prod via `scripts/import-contracts-microcks.sh` (client
  `microcks-automation`). Requer secret de repo `MICROCKS_AUTOMATION_SECRET` (= valor de
  `infra/microcks/.env.microcks`). Fecha o ciclo CI→portal.

> Nota: o `restful-api`/`service-communication` seguem como docs; o Microcks cobre a
> navegação interativa dos contratos. Se um dia quiserem lineage produtor/consumidor e grafo
> de domínios, reavaliar EventCatalog (com licença) ou Backstage.

## Problema

As APIs do mcad estão documentadas de forma **fragmentada** e não há um lugar central para consultar:

- Cada serviço .NET expõe seu próprio Swagger em portas diferentes; os serviços Java não expõem OpenAPI nenhum.
- A documentação de integração assíncrona (eventos) vive só em `docs/events.md` (manual) e em specs AsyncAPI gerados em runtime apenas pelos serviços .NET.
- Não existe portal central, nem para REST nem para eventos.

Objetivo: um **portal central** para consultar a documentação das APIs síncronas (REST/OpenAPI) **e** assíncronas (eventos/AsyncAPI), com possibilidade de **mock** e **contract testing**.

## Diagnóstico do estado atual (2026-06-16)

| Serviço | REST (OpenAPI) | Assíncrono (eventos) |
|---|---|---|
| `cadastro-api` (.NET) | ✅ Swashbuckle — `/swagger/v1/swagger.json` | ✅ AsyncAPI via Saunter — `/asyncapi/asyncapi.json` |
| `identificacao-api` (.NET) | ✅ idem | ✅ idem |
| `arrecadacao-api` (Java) | ❌ sem springdoc-openapi | ❌ sem AsyncAPI |
| `distribuicao-api` (Java) | ❌ sem springdoc-openapi | ❌ sem AsyncAPI |
| Catálogo central | ❌ inexistente | 🟡 só `docs/events.md` (18 eventos, manual) |

- Envelope de eventos: **CloudEvents 1.0 em modo *structured*** (metadados no corpo JSON).
- Entrega: **at-least-once** via Outbox Pattern.
- Broker: RabbitMQ, vhost `mcad`, 5 topic exchanges (`cadastro.events`, `identificacao.events`, `arrecadacao.events`, `distribuicao.events`, `identity.events`).

## Decisão

Adotar **dois componentes complementares**, alimentados pelos **mesmos contratos versionados**:

- **EventCatalog** (self-host no Swarm) → portal de **leitura/descoberta**: navega REST (OpenAPI) e eventos (AsyncAPI) num único portal, modela os 4 bounded contexts e a relação produtor/consumidor de cada evento, com changelog.
- **Microcks** (self-host no Swarm) → camada **ativa**: mock de endpoints REST e de eventos assíncronos + **contract testing** no CI. Conecta no RabbitMQ `mcad` para mockar/testar eventos AMQP.

```
                  contracts/  (openapi.json + asyncapi.yaml por serviço, versionado no git)
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   EventCatalog (Swarm)         Microcks (Swarm)
   = portal de LEITURA          = camada ATIVA
   domínios→serviços→eventos    mock REST + async + contract test
   lineage produtor/consumidor  conecta no RabbitMQ mcad
   changelog                    roda no CI
```

### Onde vivem os contratos

Neste monorepo, num diretório central na raiz (fonte única para os dois portais e para o CI):

```
contracts/
├── cadastro/        openapi.json  asyncapi.yaml
├── identificacao/   openapi.json  asyncapi.yaml
├── arrecadacao/     openapi.json  asyncapi.yaml
└── distribuicao/    openapi.json  asyncapi.yaml
```

- São **artefatos gerados** (springdoc/Swashbuckle/Saunter), não escritos à mão. A fonte da verdade continua sendo o código; o arquivo é o snapshot validado.
- Versionados no git para o CI detectar **drift** (spec commitado ≠ o que o código gera → quebra o build).
- Central (e não dentro de cada `services/<svc>/`) porque EventCatalog e Microcks precisam varrer todos os specs de uma vez.

## Alternativas consideradas e descartadas

| Alternativa | Por que não |
|---|---|
| **Swagger UI + importar openapi.json** (ideia inicial) | Resolve só REST; não fala AsyncAPI. Deixaria toda a integração assíncrona de fora. |
| **Swagger UI + AsyncAPI Studio** (dois portais) | Leve, mas dois portais separados, sem noção de domínio/bounded context, sem lineage. |
| **Bump.sh (SaaS free-tier)** | Bom e zero-infra, mas optou-se por self-host no Swarm. Fica como plano B. |
| **Repo de contratos separado** | Faz sentido com muitos times/repos. Aqui (monorepo, PoC, um time) só adiciona fricção. |

## Pontos de atenção / caveats

- **Keycloak do Microcks ≠ auth da aplicação.** O Microcks traz um Keycloak próprio (self-hosted na stack) só para o RBAC/admin *do Microcks*. A autenticação dos usuários do mcad continua sendo o **Logto**. São dois IdPs com propósitos distintos. O Keycloak do Microcks é opcional (modo anônimo), mas será mantido para ter login no portal de mocks.
- **AMQP + headers no Microcks.** No binding AMQP o Microcks **ignora headers** da mensagem. Como os eventos usam **CloudEvents *structured*** (tudo no corpo JSON), isso **não afeta** hoje. Se um dia migrar para CloudEvents *binary* (metadados em headers), o Microcks perderia esses campos.
- **Stack async do Microcks é a parte mais pesada** (async-minion + broker). Pode-se subir primeiro só REST e adicionar o async-minion depois.

## Plano de execução

### Fase 1 — Fundação: todo serviço com OpenAPI + AsyncAPI versionado (pré-requisito)
1. **Java (arrecadacao, distribuicao)**: adicionar `springdoc-openapi` → expõe `/v3/api-docs`.
2. **Java**: escrever os `asyncapi.yaml` dos eventos (`arrecadacao.*`, `distribuicao.*`) com **AMQP bindings**, espelhando `docs/events.md`.
3. **.NET (cadastro, identificacao)**: exportar os specs já gerados em runtime para **arquivos estáticos** no build; adicionar AMQP bindings no Saunter.
4. Consolidar tudo em `contracts/<service>/{openapi.json,asyncapi.yaml}` versionado.

### Fase 2 — Portais no Swarm
5. **EventCatalog**: generators de OpenAPI + AsyncAPI apontando para `contracts/`, modelar os 4 domínios → build estático → container nginx → stack no Swarm com rota Traefik (ex.: `docs.mcad.<host>`).
6. **Microcks**: stack no Swarm (`webapp` + `mongodb` + `keycloak` + `async-minion` → RabbitMQ `mcad`); importar specs de `contracts/` via API importer. Rota Traefik (ex.: `mocks.mcad.<host>`).

### Fase 3 — CI
7. Pipeline: regenerar specs no build e **falhar se houver drift**, rebuildar EventCatalog, reimportar no Microcks e rodar os **contract tests** do Microcks contra os serviços.

## Referências

- Microcks — arquitetura/deployment: https://microcks.io/documentation/explanations/deployment-options/
- Microcks — suporte AMQP/RabbitMQ: https://github.com/microcks/microcks/issues/403
- Microcks — limitação de headers AMQP: https://github.com/microcks/microcks/issues/737
- `docs/events.md` — catálogo de eventos atual (18 eventos, 5 domínios)
- `docs/architecture/service-communication.md` — topologia de comunicação entre serviços
