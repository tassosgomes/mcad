# Catálogo de Permissões — Identificação API

> Referência canônica das permissões finas (`identificacao:default:<recurso>:<acao>`) aplicadas
> nos endpoints da `identificacao-api`. Origem dos nomes: `IdentificacaoPermissions.cs`.
> Regra geral dos papéis (PRD §5.2):
> * `identificacao.default.consultor` — leitura / consulta.
> * `identificacao.default.analista` — herda do consultor e adiciona escrita / mudança de status / importação.
>
> **Formato das chaves**: 4 segmentos `dominio:area:recurso:acao`, com `area=default`,
> conforme decisão consolidada em `docs/adr/0002-permission-naming-convention.md`.

## Captação (rol de captação)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `identificacao:default:captacao:listar` | Lista captações com filtros e paginação | GET | `/api/v1/captacoes` | identificacao.default.consultor |
| `identificacao:default:captacao:visualizar` | Detalha uma captação | GET | `/api/v1/captacoes/{id}` | identificacao.default.consultor |
| `identificacao:default:captacao:visualizar` | Verifica se a captação pode ser cancelada | GET | `/api/v1/captacoes/{id}/pode-cancelar` | identificacao.default.consultor |
| `identificacao:default:captacao:visualizar` | Lista pré-requisitos para fechamento do rol | GET | `/api/v1/captacoes/{id}/pre-requisitos` | identificacao.default.consultor |
| `identificacao:default:captacao:criar` | Cria uma captação | POST | `/api/v1/captacoes` | identificacao.default.analista |
| `identificacao:default:captacao:editar` | Atualiza uma captação | PUT | `/api/v1/captacoes/{id}` | identificacao.default.analista |
| `identificacao:default:captacao:excluir` | Exclui uma captação | DELETE | `/api/v1/captacoes/{id}` | identificacao.default.analista |
| `identificacao:default:captacao:cancelar` | Cancela o rol de uma captação | POST | `/api/v1/captacoes/{id}/cancelar` | identificacao.default.analista |
| `identificacao:default:captacao:fechar` | Fecha o rol da captação | POST | `/api/v1/captacoes/{id}/fechar` | identificacao.default.analista |

## Execução musical

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `identificacao:default:execucao:listar` | Lista execuções de uma captação | GET | `/api/v1/captacoes/{captacaoId}/execucoes` | identificacao.default.consultor |
| `identificacao:default:execucao:criar` | Cria uma execução manual | POST | `/api/v1/captacoes/{captacaoId}/execucoes` | identificacao.default.analista |
| `identificacao:default:execucao:editar` | Atualiza uma execução | PUT | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | identificacao.default.analista |
| `identificacao:default:execucao:excluir` | Exclui uma execução | DELETE | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | identificacao.default.analista |

## Rubrica e tipo de utilização (cadastros auxiliares)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `identificacao:default:rubrica:listar` | Lista rubricas disponíveis | GET | `/api/v1/rubricas` | identificacao.default.consultor |
| `identificacao:default:tipo-utilizacao:listar` | Lista tipos de utilização | GET | `/api/v1/tipos-utilizacao` | identificacao.default.consultor |

## Upload de CSV (importação em lote)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `identificacao:default:upload:importar` | Envia arquivo CSV de execuções | POST | `/api/v1/captacoes/{captacaoId}/uploads` | identificacao.default.analista |
| `identificacao:default:upload:listar` | Lista uploads de uma captação | GET | `/api/v1/captacoes/{captacaoId}/uploads` | identificacao.default.consultor |
| `identificacao:default:upload:visualizar` | Detalha um upload | GET | `/api/v1/captacoes/{captacaoId}/uploads/{id}` | identificacao.default.consultor |
| `identificacao:default:upload:visualizar-erros` | Lista erros de processamento de um upload | GET | `/api/v1/captacoes/{captacaoId}/uploads/{id}/erros` | identificacao.default.consultor |

## Pendentes (execuções não identificadas)

| Permissão | Descrição | Método | Endpoint | Papel inicial |
|---|---|---|---|---|
| `identificacao:default:pendente:listar` | Lista execuções pendentes de identificação | GET | `/api/v1/pendentes` | identificacao.default.consultor |
| `identificacao:default:pendente:visualizar-impacto` | Lista impacto de uma proposta de resolução | GET | `/api/v1/pendentes/impacto` | identificacao.default.consultor |
| `identificacao:default:pendente:resolver` | Resolve uma execução pendente | POST | `/api/v1/pendentes/{id}/resolver` | identificacao.default.analista |
| `identificacao:default:pendente:resolver` | Resolve várias execuções em lote | POST | `/api/v1/pendentes/resolver-lote` | identificacao.default.analista |

## Composição dos papéis iniciais

```yaml
roles:
  identificacao.default.consultor:
    permissions:
      - identificacao:default:captacao:listar
      - identificacao:default:captacao:visualizar
      - identificacao:default:execucao:listar
      - identificacao:default:rubrica:listar
      - identificacao:default:tipo-utilizacao:listar
      - identificacao:default:upload:listar
      - identificacao:default:upload:visualizar
      - identificacao:default:upload:visualizar-erros
      - identificacao:default:pendente:listar
      - identificacao:default:pendente:visualizar-impacto

  identificacao.default.analista:
    inheritsFrom:
      - identificacao.default.consultor
    permissions:
      - identificacao:default:captacao:criar
      - identificacao:default:captacao:editar
      - identificacao:default:captacao:excluir
      - identificacao:default:captacao:cancelar
      - identificacao:default:captacao:fechar
      - identificacao:default:execucao:criar
      - identificacao:default:execucao:editar
      - identificacao:default:execucao:excluir
      - identificacao:default:upload:importar
      - identificacao:default:pendente:resolver
```

## Observações

- O catálogo do PRD §4.2 propôs nomes notional (ex. `identificacao:obra:validar`).
  Aqui foram ajustados conforme os endpoints reais da Identificação API
  (captação, execução, rubrica, upload, pendentes), seguindo a nota
  "Ajustar os nomes conforme os endpoints reais da API" do próprio PRD.
- Endpoints públicos (sem permissão fina): `GET /health` (AllowAnonymous),
  AsyncAPI e Swagger.
