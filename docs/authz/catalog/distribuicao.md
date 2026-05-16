# Catálogo de Permissões — Distribuição API

> Referência canônica das permissões finas aplicadas nos endpoints da
> `distribuicao-api` via `authz-spring-boot-starter`. Origem dos nomes:
> `services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml`.
> Regra geral dos papéis:
> * `distribuicao.consultor` — leitura / consulta / visualização.
> * `distribuicao.analista` — herda do consultor e adiciona escrita / transições de estado.

> **Formato das chaves**: 4 segmentos `dominio:area:recurso:acao`, com `area=default`,
> padrão uniforme em todo o mcad (cadastro, identificacao, arrecadacao, distribuicao).
> Adotamos o padrão **`distribuicao:default:<recurso>:<acao>`** em todo
> o serviço — `default` é a área neutra, deixando espaço para futuras subdivisões
> sem nova migração. Esta decisão está consolidada em
> `docs/adr/0002-permission-naming-convention.md` e refletida no `permissions.yaml`
> do serviço.

## Rubrica (F01 — legacy migrado para o novo padrão)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `distribuicao:default:rubrica:listar` | Lista as rubricas sincronizadas a partir da Arrecadação | GET | `/api/v1/rubricas` | distribuicao.consultor |
| `distribuicao:default:rubrica:visualizar` | Detalhe de uma rubrica específica | GET | `/api/v1/rubricas/{sigla}` | distribuicao.consultor |

## Processo de Distribuição (F02, planejado neste PRD)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `distribuicao:default:processo:listar` | Lista paginada de processos de distribuição com filtros (rubrica, período, status) | GET | `/api/v1/processos` | distribuicao.consultor |
| `distribuicao:default:processo:listar` | Lista combinações rubrica+período disponíveis para criação de processo | GET | `/api/v1/processos/disponiveis` | distribuicao.consultor |
| `distribuicao:default:processo:visualizar` | Detalhes completos de um processo de distribuição | GET | `/api/v1/processos/{id}` | distribuicao.consultor |
| `distribuicao:default:processo:criar` | Cria um novo processo de distribuição para uma combinação rubrica+período com Rol fechado e Verba disponível | POST | `/api/v1/processos` | distribuicao.analista |
| `distribuicao:default:processo:calcular` | Dispara o cálculo de créditos — transiciona o processo de CRIADO para CALCULADO (F02, planejado neste PRD) | POST | `/api/v1/processos/{id}/calcular` | distribuicao.analista |
| `distribuicao:default:processo:aprovar` | Aprova o resultado do cálculo — transiciona o processo de CALCULADO para APROVADO (F02, planejado neste PRD) | POST | `/api/v1/processos/{id}/aprovar` | distribuicao.analista |
| `distribuicao:default:processo:finalizar` | Finaliza o processo — transiciona de APROVADO para FINALIZADO (ação irreversível) (F02, planejado neste PRD) | POST | `/api/v1/processos/{id}/finalizar` | distribuicao.analista |
| `distribuicao:default:processo:cancelar` | Cancela o processo a partir de qualquer estado exceto FINALIZADO; exige justificativa obrigatória (F02, planejado neste PRD) | POST | `/api/v1/processos/{id}/cancelar` | distribuicao.analista |

## Observações operacionais

* O starter é ativado por configuração: o bloco `ecad.authz` em `application.yml` controla
  `base-url`, `catalog.domain`, `register-on-startup` e parâmetros de cache.
* Com `register-on-startup=true` (padrão), o catálogo é enviado automaticamente a cada deploy
  via `POST /permission-catalog/register` para o serviço `ecad-authz`.
* Sem JWT válido, o filtro do Spring Security retorna **401 Unauthorized**.
  Sem a permissão correspondente, o starter retorna **403 Forbidden**.
* Cache local (TTL 60 s) + cache Redis (TTL 300 s) amortizam chamadas ao `ecad-authz`
  em runtime; configuraváveis via variáveis de ambiente `ECAD_AUTHZ_REMOTE_CACHE` e
  `ECAD_AUTHZ_BASE_URL`.
* O catálogo deste documento espelha o conteúdo de `permissions.yaml`. Atualizações
  devem ser feitas nos dois locais (yaml é a fonte da verdade para registro automático).
* Testes de autorização (401/403/200) estão em
  `distribuicao-tests/.../authz/AuthzPermissionEnforcementTest.java`,
  mockando `AuthzDecisionClient` (espelho de `arrecadacao-tests`).
