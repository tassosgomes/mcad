# Catálogo de Permissões — Arrecadação API

> Referência canônica das permissões finas aplicadas nos endpoints da
> `arrecadacao-api` via `authz-spring-boot-starter`. Origem dos nomes:
> `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml`.
> Regra geral dos papéis (PRD §5.2):
> * `arrecadacao.default.consultor` — leitura / consulta / exportação.
> * `arrecadacao.default.analista` — herda do consultor e adiciona escrita / mudança de status / processamento.

> **Formato das chaves**: 4 segmentos `dominio:area:recurso:acao`, com `area=default`,
> padrão uniforme em todo o mcad (cadastro, identificacao, arrecadacao e — futuro —
> distribuicao). Adotamos o padrão **`arrecadacao:default:<recurso>:<acao>`** em todo
> o serviço — `default` é a área neutra, deixando espaço para futuras subdivisões
> sem nova migração. Esta decisão está consolidada em
> `docs/adr/0002-permission-naming-convention.md` e refletida no `permissions.yaml`
> do serviço.

## Cliente / Usuário de música

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `arrecadacao:default:cliente:listar` | Lista paginada e filtrada de usuários de música | GET | `/api/v1/usuarios-musica` | arrecadacao.default.consultor |
| `arrecadacao:default:cliente:visualizar` | Detalha um usuário de música | GET | `/api/v1/usuarios-musica/{id}` | arrecadacao.default.consultor |
| `arrecadacao:default:cliente:visualizar` | Lista histórico de status do usuário de música | GET | `/api/v1/usuarios-musica/{id}/historico-status` | arrecadacao.default.consultor |
| `arrecadacao:default:cliente:criar` | Cadastra novo usuário de música | POST | `/api/v1/usuarios-musica` | arrecadacao.default.analista |
| `arrecadacao:default:cliente:editar` | Atualiza dados cadastrais do usuário de música | PUT | `/api/v1/usuarios-musica/{id}` | arrecadacao.default.analista |
| `arrecadacao:default:cliente:editar` | Inativa o usuário de música | POST | `/api/v1/usuarios-musica/{id}/inativar` | arrecadacao.default.analista |
| `arrecadacao:default:cliente:editar` | Reativa o usuário de música | POST | `/api/v1/usuarios-musica/{id}/ativar` | arrecadacao.default.analista |

## Contrato / Licença

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `arrecadacao:default:contrato:listar` | Lista paginada e filtrada de licenças | GET | `/api/v1/licencas` | arrecadacao.default.consultor |
| `arrecadacao:default:contrato:visualizar` | Detalha uma licença | GET | `/api/v1/licencas/{id}` | arrecadacao.default.consultor |
| `arrecadacao:default:contrato:visualizar` | Lista histórico de status da licença | GET | `/api/v1/licencas/{id}/historico-status` | arrecadacao.default.consultor |
| `arrecadacao:default:contrato:criar` | Cria nova licença | POST | `/api/v1/licencas` | arrecadacao.default.analista |
| `arrecadacao:default:contrato:editar` | Suspende uma licença | POST | `/api/v1/licencas/{id}/suspender` | arrecadacao.default.analista |
| `arrecadacao:default:contrato:editar` | Reativa uma licença | POST | `/api/v1/licencas/{id}/reativar` | arrecadacao.default.analista |
| `arrecadacao:default:contrato:cancelar` | Encerra uma licença | POST | `/api/v1/licencas/{id}/encerrar` | arrecadacao.default.analista |

## Cobrança / UDA / Rubricas

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `arrecadacao:default:cobranca:listar` | Consulta valor vigente da UDA | GET | `/api/v1/uda/vigente` | arrecadacao.default.consultor |
| `arrecadacao:default:cobranca:listar` | Lista histórico de UDAs | GET | `/api/v1/uda/historico` | arrecadacao.default.consultor |
| `arrecadacao:default:cobranca:listar` | Lista rubricas disponíveis | GET | `/api/v1/rubricas` | arrecadacao.default.consultor |
| `arrecadacao:default:cobranca:emitir` | Ajusta valor da UDA com data de vigência | POST | `/api/v1/uda` | arrecadacao.default.analista |

## Pagamento

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `arrecadacao:default:pagamento:listar` | Lista paginada e filtrada de pagamentos | GET | `/api/v1/pagamentos` | arrecadacao.default.consultor |
| `arrecadacao:default:pagamento:visualizar` | Detalha um pagamento | GET | `/api/v1/pagamentos/{id}` | arrecadacao.default.consultor |
| `arrecadacao:default:pagamento:conciliar` | Registra novo pagamento associado a uma licença | POST | `/api/v1/pagamentos` | arrecadacao.default.analista |
| `arrecadacao:default:pagamento:estornar` | Estorna pagamento confirmado, com justificativa | POST | `/api/v1/pagamentos/{id}/estornar` | arrecadacao.default.analista |

## Relatórios / Verbas

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `arrecadacao:default:relatorio:visualizar` | Lista paginada de verbas por rubrica/período/status | GET | `/api/v1/verbas` | arrecadacao.default.consultor |
| `arrecadacao:default:relatorio:visualizar` | Agrega verbas por rubrica no intervalo informado | GET | `/api/v1/verbas/agregado-por-rubrica` | arrecadacao.default.consultor |
| `arrecadacao:default:relatorio:visualizar` | Detalha uma verba específica | GET | `/api/v1/verbas/{rubricaSigla}/{periodo}` | arrecadacao.default.consultor |
| `arrecadacao:default:relatorio:exportar` | Reservada para o futuro endpoint de exportação | — | — | arrecadacao.default.consultor |

## Observações operacionais

* O starter é ativado por configuração: `ecad.authz.enabled=true` (padrão em `application-dev.yml`,
  desligado por padrão em `application.yml` e em todos os testes).
* O serviço de AuthZ é alcançável via `AUTHZ_BASE_URL`. Redis (`AUTHZ_REDIS_HOST`/`AUTHZ_REDIS_PORT`)
  é usado como cache distribuído e para checagem de revogação de sessão.
* O catálogo deste documento espelha o conteúdo de `permissions.yaml`. Atualizações
  devem ser feitas nos dois locais (yaml é a fonte da verdade para registro automático
  via `POST /permission-catalog/register`).
