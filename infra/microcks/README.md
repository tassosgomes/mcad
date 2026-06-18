# Microcks — portal de contratos + mocks (Fase 2)

Microcks serve como **portal de documentação** (navega os OpenAPI + AsyncAPI de
`contracts/`) e, na Fase 2b, como **mock + contract testing**. Apache-2.0, self-host.

## Protótipo local (Fase 2a)

`docker-compose.yml` sobe o core (mongo + keycloak + postman + app), com **Keycloak
desabilitado** (upload aberto) para validação rápida.

```bash
docker compose -f infra/microcks/docker-compose.yml up -d
# UI:  http://localhost:18081
MICROCKS_URL=http://localhost:18081 scripts/import-contracts-microcks.sh   # importa os 8 contratos
```

## Deploy no Swarm (`microcks-stack.yml`, raiz do repo)

Host único `MICROCKS_HOST` (Microcks na raiz, Keycloak em `/auth`), TLS via
`cloudflare-resolver`, ingress por `traefik-public`. Keycloak **habilitado** (SSO).

1. **DNS**: cadastrar `MICROCKS_HOST` (ex.: `mcad-docs.tasso.dev.br`) no Cloudflare,
   apontando para o nó do Swarm (igual aos demais `mcad-*.tasso.dev.br`).
2. **Env**: `cp infra/microcks/.env.microcks.example infra/microcks/.env.microcks` e preencha
   (host, senhas do Keycloak, `MICROCKS_AUTOMATION_SECRET`). Esse arquivo é **gitignored**.
3. **Realm**: `infra/microcks/render-realm.sh` → gera
   `infra/microcks/keycloak-realm/microcks-realm-prod.json` (gitignored, com os secrets).
   O `microcks-stack.yml` publica esse arquivo como **Swarm config** `microcks_realm`.
4. **Deploy** (Portainer): subir `microcks-stack.yml` com o env-file
   `infra/microcks/.env.microcks`. O nó precisa ter o realm renderizado no caminho da config.
5. **Importar contratos**:
   ```bash
   MICROCKS_URL=https://$MICROCKS_HOST scripts/import-contracts-microcks.sh
   # usa client_credentials do client 'microcks-automation' (secret do .env.microcks)
   ```

### Login do portal
- Usuário do realm `microcks`: `admin` / `KEYCLOAK_ADMIN_PASSWORD` (do `.env.microcks`).
- Console do Keycloak (master): `KEYCLOAK_BOOTSTRAP_ADMIN` / `KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`,
  em `https://$MICROCKS_HOST/auth`.

### Validado
- Realm de prod importa no Keycloak 26 sem erro; o client `microcks-automation`
  (client_credentials) recebe token com `resource_access.microcks-app: [manager]` — ok p/ upload.
- Os 8 contratos importam e geram 4 serviços REST + 4 EVENT no Microcks.

## Fase 2b — async mock (Kafka + LavinMQ + async-minion)

Mock de **eventos** AMQP. Componentes que entram na stack:
- **kafka** — bus interno do Microcks (webapp ↔ minion). KRaft single-node (sem Zookeeper).
- **lavinmq** — alvo AMQP 0.9.1 dos mocks (drop-in RabbitMQ, leve). **Interno à stack**
  (sem porta publicada). Contorna o CloudAMQP do mcad não permitir vhost dedicado.
- **async-minion** — publica os mocks no LavinMQ a partir dos exemplos dos AsyncAPI.

Config do minion: `config/application.properties` (bus Kafka + `supported-bindings=KAFKA,WS,AMQP`
+ `amqp.server=lavinmq:5672` guest/guest). Os mesmos nomes de serviço valem local e no Swarm.

### Validado localmente (ponta-a-ponta)
- `docker compose -f infra/microcks/docker-compose.yml up -d` sobe tudo healthy.
- Evento real `arrecadacao.pagamento.registrado` (CloudEvents) é mockado e **consumido do
  LavinMQ** com payload realista. UI do LavinMQ em `http://localhost:25672` (guest/guest).

### Deploy da Fase 2b no Swarm — DEPLOYADO em prod (2026-06-17)
Além dos passos da Fase 2a, antes de subir o stack:
```bash
# Config externa do minion (sem segredo — LavinMQ interno guest/guest):
ssh mcad-server "docker config create microcks_minion_props -" < infra/microcks/config/application.properties
```
O `app` recebe env `MICROCKS_AUTOMATION_SECRET` (Env do stack) e o minion injeta
`MICROCKS_SERVICEACCOUNT=microcks-automation` + `MICROCKS_SERVICEACCOUNT_CREDENTIALS`
(secret via env, fora do arquivo commitado). Portainer puxa apache/kafka, cloudamqp/lavinmq,
microcks-async-minion.

**Gotchas aprendidos no deploy (já aplicados no stack):**
- **Kafka KRaft não resolve o próprio nome de serviço** no overlay do Swarm (vira VIP) no
  boot → `KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093` (advertised segue `kafka:19092`).
- Com Keycloak ON, o **minion precisa de service account com role `user`** (não só `manager` —
  roles do Microcks não são hierárquicas). O realm foi atualizado (`microcks_realm_v2`):
  `service-account-microcks-automation` → `microcks-app: [manager, user]`. Como o Keycloak
  roda `start-dev` (H2, reimporta a cada restart), atualizar o realm = nova config Swarm
  `microcks_realm_vN` + trocar o `source` no stack.

### Convenção de nome da exchange (IMPORTANTE p/ consumir mock)
O Microcks **ignora o `exchange.name` do spec** e cria a exchange como
`{serviço}-{versão}-{operação}` (ex.: `ArrecadacaoEvents-1.0.0-sendPagamentoRegistrado`).
Consumidores de mock bindam **nessa** exchange no LavinMQ, não na `arrecadacao.events` real.

### Cobertura por serviço (o que falta p/ mockar cada evento)
| Serviço | Binding AMQP | Exemplo de msg | Falta |
|---|---|---|---|
| arrecadacao, distribuicao (Java) | ✅ inline | ⏳ parcial | adicionar `examples:` nas mensagens |
| cadastro, identificacao (.NET/Saunter) | ❌ `$ref` não-resolvido | ✅ | emitir binding AMQP **inline** (fix Saunter) |

> Consumo cross-stack (serviços do mcad ↔ LavinMQ): pendente — exige rede overlay
> compartilhada ou porta AMQP exposta. 1º deploy mantém LavinMQ interno.

## Caveats gerais
- **Mocks vazios sem exemplos**: specs gerados têm poucos exemplos; o Microcks documenta as
  operações mas os mocks (REST e async) ficam vazios até semearmos exemplos.
- **Binding AMQP ignora headers** — ok, pois os eventos são CloudEvents *structured* (tudo no corpo).
