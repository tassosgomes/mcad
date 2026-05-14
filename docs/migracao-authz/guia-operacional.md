# Guia operacional para migração de AuthZ por serviço

Este guia registra a sequência correta para migrar cada serviço do MCAD para autorização fina via `ecad-authz`.

O ponto crítico aprendido na migração do `cadastro-api`: a API não deve ser implantada exigindo permissões que ainda não existem no catálogo do `ecad-authz`, pois isso impede a atribuição na tela administrativa e causa negação de acesso.

## Ambiente local com ecad-authz

### Subir o ecad-authz

Há duas formas de rodar o backend do `ecad-authz` localmente:

1. **Preferida — usando o compose do próprio repositório** (Postgres + Redis + Keycloak dedicados):

   ```bash
   docker compose -f /home/tsgomes/github-tassosgomes/ecad-authz/infra/dev/docker-compose.yml up -d
   ```

   Em seguida suba o backend Java do ecad-authz pelo Maven do repositório:

   ```bash
   cd /home/tsgomes/github-tassosgomes/ecad-authz/backend
   mvn -pl authz-bootstrap -am spring-boot:run
   ```

2. **Alternativa — stubs no `docker-compose.dev.yml` do mcad** (perfil `authz`):

   ```bash
   docker compose -f docker-compose.dev.yml --profile authz up -d
   ```

   Requer imagem `ecad-authz:local` (ou `ECAD_AUTHZ_IMAGE` apontando para tag publicada). Os stubs usam portas `55432` (Postgres) e `56379` (Redis) para não conflitar com `mcad-postgres`/`mcad-rabbitmq`.

### Variáveis de ambiente relevantes

Copiar de `.env.example` para `.env` e preencher os campos `<...>`:

- `AUTHZ_BASE_URL` — base URL do ecad-authz (default `http://localhost:8085`).
- `AUTHZ_TIMEOUT_MS` / `AUTHZ_TIMEOUT_SECONDS` — timeout em ms (BFF) e em segundos (SDKs legados).
- `AUTHZ_CACHE_TTL_SECONDS` — TTL do cache local do SDK em cada API.
- `AUTHZ_ADMIN_TOKEN` — Bearer token admin **usado SOMENTE** pelo `scripts/seed-authz.sh`.
- `AUTHZ_SERVICE_TOKEN_CADASTRO`, `AUTHZ_SERVICE_TOKEN_IDENTIFICACAO`, `AUTHZ_SERVICE_TOKEN_ARRECADACAO` — tokens de serviço por API.

## Rodando o seed (`scripts/seed-authz.sh`)

O script popula no ecad-authz:

1. Catálogos das 3 APIs (cadastro, identificacao, arrecadacao) — total **78 permissões**.
2. 6 papéis padrão (`*.default.consultor` e `*.default.analista` por domínio).
3. Atribui esses papéis a 3 usuários de teste pré-cadastrados.

> **Resolvido em 2026-05-14: formato uniforme em 4 segmentos.** Todas as 3 APIs migradas (cadastro, identificacao, arrecadacao) publicam permissões no formato `dominio:area:recurso:acao` (4 segmentos), com `area=default` como valor neutro. Decisão consolidada em `docs/adr/0002-permission-naming-convention.md`. O ecad-authz aceita o padrão via o pattern `^[a-z0-9]+:[a-z0-9-]+:[a-z0-9-]+(:[a-z0-9-]+)?$`.

> **Nota sobre keys de papel.** O OpenAPI do ecad-authz exige que `role.key` tenha no mínimo 3 segmentos separados por ponto (`dominio.area.nome`). Por isso os papéis foram seedados como `cadastro.default.consultor`, `cadastro.default.analista`, etc., e não como `cadastro.consultor` que era a notação simplificada do PRD.

### Pré-requisitos

- `curl` e `jq` instalados.
- ecad-authz acessível em `$AUTHZ_BASE_URL`.
- `AUTHZ_ADMIN_TOKEN` exportado (Bearer token de service admin / TI global).
- Os 3 usuários de teste devem existir no ecad-authz **antes** de rodar o seed (eles são sincronizados do Logto/Keycloak ou criados pelas próprias telas do ecad-authz). O script só atribui papéis — não cria usuários.

### Comandos

```bash
# Carregar variáveis do .env
export $(grep -v '^#' .env | xargs)

# Dry-run (mostra todas as requisições sem executar)
./scripts/seed-authz.sh --dry-run

# Seed completo: catálogos + papéis + atribuições
./scripts/seed-authz.sh

# Só um catálogo
./scripts/seed-authz.sh --service cadastro
./scripts/seed-authz.sh --service identificacao
./scripts/seed-authz.sh --service arrecadacao

# Pular etapas
./scripts/seed-authz.sh --skip-catalogs       # só papéis e atribuições
./scripts/seed-authz.sh --skip-assignments    # tudo menos atribuições

# Ajuda
./scripts/seed-authz.sh --help
```

O script é **idempotente**: pode rodar várias vezes. Catálogos repetidos não duplicam (o ecad-authz retorna `registered=0 updated=N`). Papéis existentes são detectados por `key`. Atribuições já ativas retornam `409` e o script ignora.

## Usuários de teste

Cadastrar previamente no ecad-authz (via sync do Logto/Keycloak ou via tela administrativa) os seguintes usuários:

| E-mail | Nome | Subject hint | Papéis (após o seed) |
|---|---|---|---|
| `consultor.dev@mcad.local` | Consultor Dev | `consultor.dev` | `cadastro.default.consultor`, `identificacao.default.consultor`, `arrecadacao.default.consultor` |
| `analista.dev@mcad.local` | Analista Dev | `analista.dev` | `cadastro.default.analista`, `identificacao.default.analista`, `arrecadacao.default.analista` |
| `sem-papel.dev@mcad.local` | Sem Papel Dev | `sem-papel.dev` | (nenhum — usado para validar 403) |

A senha de cada usuário (em ambiente local) é definida no provedor de identidade (Logto ou Keycloak). O ecad-authz não armazena senhas.

## Validação rápida

Com o seed aplicado e os usuários autenticados (obtenha um access token JWT pelo Logto/Keycloak):

```bash
# Consultor — deve listar permissões dos 3 domínios (read-only)
curl -sS -H "Authorization: Bearer $CONSULTOR_TOKEN" \
  "$AUTHZ_BASE_URL/v1/me/authorization-context" | jq '.permissions | sort'

# Analista — deve listar permissões de leitura + escrita
curl -sS -H "Authorization: Bearer $ANALISTA_TOKEN" \
  "$AUTHZ_BASE_URL/v1/me/authorization-context" | jq '.permissions | sort'

# Sem papel — deve retornar uma lista vazia de permissions/roles
curl -sS -H "Authorization: Bearer $SEMPAPEL_TOKEN" \
  "$AUTHZ_BASE_URL/v1/me/authorization-context" | jq '{roles, permissions}'
```

Em seguida, validar 401/403/200 nas APIs:

- Sem `Authorization` → `401`.
- Token de `sem-papel.dev` em endpoint protegido → `403`.
- Token de `consultor.dev` em endpoint de leitura → `200`.
- Token de `consultor.dev` em endpoint de escrita → `403`.
- Token de `analista.dev` em endpoint de escrita → `200` (ou `400` se payload inválido, o que ainda valida que a autorização passou).


## Ordem recomendada

1. Mapear permissões do serviço
   - Listar todos os endpoints protegidos.
   - Definir permissões no formato uniforme `{dominio}:{area}:{recurso}:{acao}` (4 segmentos, ADR 0002).
   - Exemplo: `cadastro:default:obra:listar`.
   - Evitar permissões genéricas como `read`, `write`, `admin` ou `dominio:*:*`.

2. Registrar catálogo no `ecad-authz`
   - Criar ou atualizar arquivo YAML em:

     ```text
     backend/authz-bootstrap/src/main/resources/permissions/
     ```

   - Incluir o arquivo no bootstrap, como foi feito para:

     ```text
     permissions/mcad-cadastro-catalog.yaml
     ```

   - Cada permissão deve conter:
     - `key`
     - `displayName`
     - `description`

3. Validar e publicar imagem do `ecad-authz`
   - Rodar:

     ```bash
     mvn -B -ntp -pl authz-bootstrap -am test
     ```

   - Confirmar no log de startup algo como:

     ```text
     catalog_registration service=<servico> registered=<N>
     ```

   - Subir a nova imagem do `ecad-authz`.
   - Abrir a tela de permissões e validar que as permissões do serviço aparecem.

4. Criar ou atualizar papéis
   - Criar papéis iniciais por domínio, por exemplo:
     - `cadastro.consultor`
     - `cadastro.analista`
   - Associar permissões de leitura ao papel consultor.
   - Associar permissões de leitura e escrita/processamento ao papel analista.

5. Atribuir papéis aos usuários de teste
   - Garantir que os usuários já foram provisionados no `ecad-authz`.
   - Se necessário, executar o backfill/sync do Logto.
   - Atribuir os papéis pela tela administrativa.

6. Migrar a API do domínio
   - Trocar `RequireAuthorization("read")` e `RequireAuthorization("write")` por permissões explícitas.
   - Em .NET, usar `RequirePermission(...)` ou helper equivalente.
   - Manter OIDC/JWT apenas como autenticação.
   - A decisão de autorização deve vir do `ecad-authz`.

7. Validar ponta a ponta
   - Sem token deve retornar `401`.
   - Token válido sem permissão deve retornar `403`.
   - Token com permissão deve passar pela autorização.
   - Para escrita, payload inválido pode retornar `400`; isso é aceitável se não retornar `403`.

## Checklist antes de subir a API migrada

```text
[ ] Catálogo do serviço existe no ecad-authz
[ ] Nova imagem do ecad-authz foi publicada e implantada
[ ] Tela de permissões mostra as permissões do serviço
[ ] Papéis iniciais foram criados
[ ] Permissões foram atribuídas aos papéis
[ ] Usuários de teste foram provisionados
[ ] Papéis foram atribuídos aos usuários de teste
[ ] API foi migrada para permissões explícitas
[ ] Testes 401/403/sucesso foram executados
```

## Convenções

Permissões novas no MCAD devem seguir o padrão de **4 segmentos**:

```text
{dominio}:{area}:{recurso}:{acao}
```

Com `area=default` quando o domínio não tem subdivisões. Exemplos:

```text
cadastro:default:obra:listar
cadastro:default:titular:editar
identificacao:default:captacao:listar
arrecadacao:default:cobranca:emitir
distribuicao:default:roteiro:processar
```

Decisão registrada em `docs/adr/0002-permission-naming-convention.md`. O formato
de 3 segmentos é considerado legado e não deve ser introduzido em código novo —
todas as APIs ativas foram migradas em 2026-05-14.

## Evidência esperada em validação

Durante o teste do bootstrap do `ecad-authz`, o log deve mostrar o catálogo do serviço sendo registrado:

```text
self_catalog_registration path=permissions/<catalogo>.yaml service=<servico> registered=<N> updated=<N> deprecated=<N> ignored=<N>
```

Se `registered=0`, isso pode ser normal em reexecuções idempotentes, desde que as permissões já apareçam na tela administrativa.

## Ordem para os próximos serviços

Para cada API restante, repetir a sequência:

1. `ecad-authz`: adicionar catálogo do serviço.
2. `ecad-authz`: publicar e subir imagem.
3. Admin UI: confirmar permissões visíveis.
4. Admin UI: criar papéis e atribuir permissões.
5. Admin UI: atribuir papéis aos usuários.
6. API do domínio: migrar endpoints para permissões explícitas.
7. API do domínio: publicar e subir imagem.
8. Validar `401`, `403` e sucesso com permissão.

Não inverter os passos 1-3 com o passo 6.
