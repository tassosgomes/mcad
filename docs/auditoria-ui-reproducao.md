# Guia de reproducao das telas e componentes de auditoria

Este guia complementa `frontend/DESIGN.md`. Use o `DESIGN.md` como fonte dos tokens visuais, tipografia, filosofia dark-first, regras de superficie e componentes base. Aqui estao apenas as instrucoes especificas para reproduzir as telas e componentes de auditoria com fidelidade funcional e estrutural.

## Escopo

Reproduzir a feature React em `frontend/src/features/auditoria`, mais os botoes de historico de auditoria embutidos nas tabelas de dominio.

Rotas esperadas:

| Rota | Tela | Arquivo de referencia |
| --- | --- | --- |
| `/auditoria` | redireciona para `/auditoria/eventos` | `frontend/src/features/auditoria/index.tsx` |
| `/auditoria/eventos` | Eventos por entidade | `frontend/src/features/auditoria/pages/AuditTimelinePage.tsx` |
| `/auditoria/acessos` | Acessos a telas | `frontend/src/features/auditoria/pages/ScreenAccessPage.tsx` |
| `/auditoria/relatorios` | Relatorios de auditoria | `frontend/src/features/auditoria/pages/AuditReportsPage.tsx` |

Componentes especificos:

| Componente | Responsabilidade |
| --- | --- |
| `AuditTabs` | Navegacao interna entre as tres telas de auditoria |
| `AuditEventTypeBadge` | Traduz `DATA_CHANGE`, `SCREEN_ACCESS`, `USER_ACTION` para badges visuais |
| `AuditEventDetailPanel` | Painel de detalhe de um evento, usado em modais e no historico de linha |
| `RowAuditHistoryButton` | Botao compacto com icone de historico em tabelas operacionais |
| `RowAuditHistoryModal` | Modal de historico por linha com lista lateral e detalhe do evento ativo |

## Dependencias que devem ser reaproveitadas

Nao recrie estes componentes. A auditoria deve usar os mesmos componentes compartilhados do app:

- `@components/ui/page-header` para cabecalho de pagina.
- `@components/ui/button` para acoes, sempre com icones de `lucide-react`.
- `@components/ui/modal` para detalhes e historico por linha.
- `@components/ui/loading` para estados pendentes.
- `@components/ui/badge` para tipos de evento e campos alterados.
- `@shared/auth/AuthContext` ou `useAuth` para permissao baseada em roles.
- `@services/apiAuditoriaClient` para chamadas autenticadas ao servico de auditoria.

O modulo deve continuar lazy-loaded em `frontend/src/app/router/routes.tsx` e protegido pelas roles de analista: `analista-cadastro`, `analista-identificacao`, `analista-arrecadacao`, `analista-distribuicao`.

## Navegacao e sidebar

No grupo da sidebar, a auditoria aparece como um modulo proprio com icone `ScrollText` e tres links filhos:

- `Eventos por entidade` -> `/auditoria/eventos`
- `Acessos a telas` -> `/auditoria/acessos`
- `Relatorios` -> `/auditoria/relatorios`

O grupo deve ficar visivel apenas para as quatro roles de analista. Consultores nao devem ver a area de auditoria nem os botoes de historico por linha.

## Layout comum das telas de auditoria

Todas as paginas usam a mesma composicao:

1. Wrapper vertical `.page` com `display: flex`, `flex-direction: column` e `gap: var(--space-6)`.
2. `PageHeader` no topo.
3. `AuditTabs` logo abaixo do cabecalho.
4. Um formulario de filtros em superficie elevada.
5. Estado de loading, erro ou vazio.
6. Tabela ou painel de status.

`AuditTabs` deve ser uma lista horizontal flexivel de `NavLink`. Cada aba usa superficie `--color-bg-surface`; hover e ativa usam `--color-bg-elevated`; texto ativo usa `--color-text-primary`. A aba ativa deve depender do `isActive` do `NavLink`, nao de estado manual.

## Tela Eventos por entidade

Cabecalho:

- Titulo: `Auditoria`
- Descricao: `Consulta de eventos consolidados no serviço central de auditoria.`

Filtros:

| Campo | Tipo | Obrigatorio | Valor inicial / comportamento |
| --- | --- | --- | --- |
| Entidade | `select` | sim | inicia em `ObraMusical`; opcoes de `auditEntityTypeOptions` |
| ID da linha | `input` texto | sim | placeholder `UUID ou código da entidade` |
| De | `input type=datetime-local` | nao | convertido para ISO antes da chamada |
| Ate | `input type=datetime-local` | nao | convertido para ISO antes da chamada |
| Buscar | `Button` primary | sim | icone `Search` tamanho 16 |

O formulario nao deve consultar enquanto o usuario digita. A chamada deve ocorrer apenas no submit, copiando os filtros para `submittedFilters`.

Endpoint consumido:

```text
GET /audit/entities/{entityType}/{entityId}/timeline?from={iso?}&to={iso?}&limit=20
```

Tabela de resultado:

| Coluna | Conteudo |
| --- | --- |
| Data | `formatAuditDate(item.occurredAt)`, fonte mono |
| Tipo | `AuditEventTypeBadge` |
| Resumo | linha primaria com `summary ?? action ?? "Evento registrado"` e linha secundaria com `eventId` |
| Usuario | `actor.displayName ?? actor.username ?? actor.userId ?? "-"` |
| Tela | `screen.screenName ?? screen.screenId ?? "-"` |
| Acoes | botao ghost pequeno com icone `Eye`, abre modal de detalhe |

Estados:

- Loading: renderizar somente `Loading`.
- Erro: `Não foi possível consultar a timeline no serviço de auditoria.`
- Vazio apos busca: `Nenhum evento encontrado para a entidade informada.`

Modal de detalhe:

- Titulo: `Detalhe do evento`.
- Tamanho: `lg`.
- Corpo: `AuditEventDetailPanel`.
- Deve abrir apenas quando `selectedEventId !== null`.

## Tela Acessos a telas

Cabecalho:

- Titulo: `Acessos a telas`
- Descricao: `Consulta dos eventos SCREEN_ACCESS registrados pelo serviço central de auditoria.`

Filtros:

| Campo | Tipo | Obrigatorio |
| --- | --- | --- |
| Usuario | texto | nao |
| Tela | texto | sim |
| Entidade | texto | nao |
| ID da entidade | texto | nao |
| De | `datetime-local` | sim |
| Ate | `datetime-local` | sim |

Endpoint consumido:

```text
GET /audit/screen-access?userId={?}&screenId={required}&entityType={?}&entityId={?}&fromUtc={iso}&toUtc={iso}&limit=20
```

Tabela:

| Coluna | Conteudo |
| --- | --- |
| Data | data formatada em fonte mono |
| Usuario | fallback `displayName`, `username`, `userId`, `-` |
| Tela | primaria `screenName`, secundaria `screenId`; pode cair para `origin` |
| Rota | `origin.route ?? "-"` |
| IP | `origin.ip ?? "-"` |
| Trace | `correlation.traceId ?? "-"`, fonte mono |

Estados:

- Erro: `Não foi possível consultar acessos a telas.`
- Vazio: `Nenhum acesso encontrado.`

## Tela Relatorios

Cabecalho:

- Titulo: `Relatórios de auditoria`
- Descricao: `Geração assíncrona de PDF pelo serviço central de auditoria.`

A tela usa layout de duas colunas em desktop: formulario de filtros a esquerda e `statusPanel` a direita. Em viewport menor que 1100px, o painel vira duas colunas; abaixo de 720px, uma coluna.

Formulario:

| Campo | Tipo | Obrigatorio | Opcoes / observacao |
| --- | --- | --- | --- |
| Tipo | select | sim | `DATA_CHANGE` = Alteração de dados, `SCREEN_ACCESS` = Acesso a telas, `MIXED` = Misto |
| De | `datetime-local` | sim | converter para ISO |
| Ate | `datetime-local` | sim | converter para ISO |
| Entidade | texto | nao | enviado como `filters.entityType` se preenchido |
| Usuario | texto | nao | enviado como `filters.actorUserId` se preenchido |
| Tela | texto | nao | enviado como `filters.screenId` se preenchido |
| Gerar PDF | Button primary | sim | icone `FileText`; desabilitado durante `createReport.isPending` |

Payload:

```json
{
  "reportType": "DATA_CHANGE",
  "from": "2026-05-14T12:00:00.000Z",
  "to": "2026-05-14T13:00:00.000Z",
  "filters": {
    "entityType": "ObraMusical",
    "actorUserId": "user-id",
    "screenId": "cadastro.obras"
  },
  "format": "PDF"
}
```

Painel de status:

- Titulo `Status`.
- Sem relatorio: `Nenhum relatório solicitado nesta sessão.`
- Erro ao solicitar: `Não foi possível solicitar o relatório.`
- Com `reportId`: exibir ID em fonte mono, status atual, datas `requestedAt` e `finishedAt` quando existirem.
- Quando o status for `DONE`, mostrar botao secondary com icone `Download` e texto `Baixar PDF`.
- O download abre `GET /audit/reports/{reportId}/pdf` em nova aba.
- Quando o status for `FAILED`, mostrar `errorMessage` ou `Relatório falhou.`

## AuditEventTypeBadge

Mapeamento obrigatorio:

| Tipo | Label | Variante do Badge |
| --- | --- | --- |
| `DATA_CHANGE` | `Alteração` | `accent` |
| `SCREEN_ACCESS` | `Acesso` | `secondary` |
| `USER_ACTION` | `Ação` | `warning` |

Nao invente novas cores especificas para auditoria. Use apenas as variantes do `Badge`.

## AuditEventDetailPanel

O painel deve funcionar tanto dentro do modal de detalhe geral quanto no modal de historico de linha.

Estados:

- Sem `eventId`: `Selecione um evento para visualizar o detalhe.`
- Loading: `Loading`.
- Erro ou sem dados: `Não foi possível carregar o evento de auditoria.`

Estrutura do painel:

1. `summaryGrid` com duas colunas em desktop e uma coluna abaixo de 760px.
2. Seis cards compactos, nesta ordem: Evento, Data, Serviço, Usuário, Tela, Rota.
3. Secao `Campos alterados`, somente se `data.data.changedFields.length > 0`.
4. Secao `Correlação`, sempre visivel.
5. `details` recolhivel com summary `Payload completo` e `JSON.stringify(data, null, 2)`.

Valores do `summaryGrid`:

| Label | Valor |
| --- | --- |
| Evento | `eventId`, fonte mono |
| Data | `formatAuditDate(occurredAt)` |
| Serviço | `source.service ?? "-"` |
| Usuário | `actor.displayName ?? actor.username ?? actor.userId ?? "-"` |
| Tela | `origin.screenName ?? screen.screenName ?? "-"` |
| Rota | `origin.route ?? "-"` |

Campos alterados:

- Cada linha e uma grid de quatro colunas: nome do campo, valor anterior, seta, valor novo.
- Nome do campo usa `Badge variant="secondary" mono`.
- Valores usam fonte mono e devem quebrar com `overflow-wrap: anywhere`.
- A seta visual entre valores e `→`.

Correlação:

- Mostrar `screenAccessId`, `commandId`, `traceId`, `requestId`, sempre nesta ordem.
- Cada item fica em bloco com fundo `--color-bg-surface`, fonte mono e tamanho `--text-xs`.

Payload completo:

- Fundo `--color-bg-floor`.
- Max-height do `pre`: 360px.
- Conteudo em fonte mono, `--text-xs`, scroll interno quando necessario.

## Historico de auditoria por linha

O botao de historico deve ser adicionado na coluna de acoes das tabelas operacionais, antes dos botoes de editar/excluir/ver detalhe. Ele aparece somente quando:

- O usuario tem uma das roles de analista em `AUDIT_ALLOWED_ROLES`.
- `entityId` existe.

Botao:

- Componente: `RowAuditHistoryButton`.
- Icone: `History` de `lucide-react`, tamanho 15.
- Variante: `ghost`, tamanho `sm`.
- Dimensoes: 32px x 32px, padding 0, centralizado.
- `aria-label`: `Histórico de {entityLabel ?? entityType}`.
- `title`: `Histórico`.

Modal de historico por linha:

- Titulo: `Histórico` ou `Histórico — {entityLabel}`.
- Tamanho: `lg`.
- Header interno: bloco mono com `entityType` a esquerda em texto muted e `entityId` a direita em texto primario.
- Chamada ao abrir:

```text
GET /audit/entities/{entityType}/{entityId}/timeline?limit=5&eventType=DATA_CHANGE
```

- O modal lista apenas `DATA_CHANGE`, limitado a 5 eventos.
- Se nenhum item estiver selecionado, o detalhe ativo deve ser o primeiro evento da lista.

Layout do modal:

- Desktop: grid com duas colunas, `minmax(260px, 0.85fr)` para a timeline e `minmax(0, 1.6fr)` para o detalhe.
- Gap: `var(--space-4)`.
- Altura maxima: 68vh; timeline e detalhe com scroll interno.
- Abaixo de 960px: uma coluna, sem limite de altura e sem scroll interno.

Item da timeline:

- Renderizado como `button`, nao `div`, para acessibilidade.
- Fundo normal: `--color-bg-surface`.
- Hover e ativo: `--color-bg-highest`.
- Conteudo:
  - topo com `AuditEventTypeBadge` e data formatada;
  - resumo em `<strong>`: `summary ?? action ?? "Alteração registrada"`;
  - usuario com fallback `displayName`, `username`, `userId`, `-`;
  - ate dois campos alterados, cada um como `{field}: {before} → {after}`;
  - icone `ChevronRight` posicionado no canto inferior direito.

Estados do modal:

- Loading: `Loading`.
- Erro: `Não foi possível carregar o histórico desta linha.`
- Vazio: `Nenhum histórico de auditoria encontrado para esta linha.`

## Entidades auditaveis

Use exatamente estes valores de `entityType` para manter compatibilidade com o backend:

| Chave | Valor | Label |
| --- | --- | --- |
| `associacao` | `Associacao` | Associação |
| `titular` | `Titular` | Titular |
| `obra` | `ObraMusical` | Obra musical |
| `fonograma` | `Fonograma` | Fonograma |
| `participacao` | `ParticipacaoConexa` | Participação |
| `titularidade` | `TitularidadeAutoral` | Titularidade |
| `usuarioMusica` | `UsuarioMusica` | Usuário de música |
| `licenca` | `Licenca` | Licença |
| `pagamento` | `Pagamento` | Pagamento |
| `uda` | `Uda` | UDA |
| `captacao` | `Captacao` | Captação |
| `execucao` | `Execucao` | Execução |
| `upload` | `Upload` | Upload |
| `pendente` | `Pendente` | Pendente |
| `rubrica` | `Rubrica` | Rubrica |
| `credito` | `Credito` | Crédito |

Tabelas que devem expor o botao de historico:

- Cadastro: `AssociacoesTable`, `TitularesTable`, `ObrasTable`, `FonogramasTable`, `TitularidadesTable`, `ParticipacoesTable`.
- Identificacao: `CaptacoesTable`, `ExecucoesTable`, `UploadsTable`, `PendentesTable`.
- Arrecadacao: `UsuariosMusicaTable`, `LicencasTable`, `PagamentosTable`, `UdaHistoricoTable`.
- Distribuicao: `RubricasTable`, `CreditosTable`.

## Cliente de API e normalizacao

A base URL vem de `runtimeConfig.auditoriaApiBaseUrl`, com fallback `/api/auditoria/v1`.

Todas as chamadas devem passar por `createAuthenticatedFetchClient`, usando o token OIDC registrado por `setAuditoriaAuthTokenProvider` no `AuthProvider`.

O cliente precisa aceitar dois formatos de resposta:

1. Resposta paginada com `{ page, size, items }`.
2. Array direto de eventos.

Tambem precisa normalizar itens vindos da view compacta do backend:

```ts
{
  eventId,
  eventType,
  occurredAtUtc,
  actorUserId,
  actorUsername,
  screenId,
  screenName,
  payload
}
```

Quando `payload` existir, preferir os dados do payload. Quando nao existir, montar `actor`, `screen`, `occurredAt`, `summary`, `action` e `correlation` a partir dos campos compactos.

## Formatadores

Datas:

- `formatAuditDate` deve retornar `-` para valor ausente.
- Deve tentar `new Date(value)`.
- Se a data for invalida, retorna o valor original.
- Se valida, usar `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })`.

Valores:

- `null` e `undefined` viram `-`.
- String, number e boolean viram texto direto.
- Objetos e arrays viram `JSON.stringify`.
- Se serializacao falhar, retornar `[valor indisponível]`.

Datas de filtro:

- `datetime-local` deve ser convertido com `new Date(value).toISOString()`.
- Valor vazio deve virar `undefined` para nao poluir query string.

Query string:

- Use uma funcao `compactParams` para omitir chaves com `undefined` ou string vazia.

## Regras de fidelidade visual especificas da auditoria

Estas regras nao substituem o `DESIGN.md`; elas so descrevem a composicao concreta da feature.

- Formularios de filtro usam grid, fundo `--color-bg-surface`, raio `--radius-lg`, padding `--space-4`, gap `--space-3`.
- Labels de filtro sao uppercase, `--text-xs`, peso 700, `letter-spacing: 0.05em`, cor `--color-text-muted`.
- Inputs e selects usam fundo `--color-bg-floor`, sem borda, raio `--radius-md`, min-height 40px.
- Focus de input/select e `box-shadow: 0 0 0 1px var(--color-accent)`.
- Tabelas usam `border-collapse: separate` e `border-spacing: 0 4px`.
- Headers de tabela usam fundo `--color-bg-elevated`, uppercase e cor muted.
- Celulas usam fundo `--color-bg-primary`; hover da linha troca celulas para `--color-bg-surface`.
- IDs, datas, traces e payloads usam `--font-mono`.
- Estados vazios e de erro sao caixas simples com fundo `--color-bg-surface`, raio `--radius-lg` ou `--radius-md`, sem icones obrigatorios.
- Nao use cards aninhados dentro dos modais alem dos blocos compactos ja descritos.
- Nao adicione paginacao visual se a implementacao de referencia usa `limit=20` ou `limit=5` sem controles de pagina.

## Checklist para outra instancia do Codex

Antes de considerar a reproducao concluida:

- Confirmar que `/auditoria` redireciona para `/auditoria/eventos`.
- Confirmar que as tres abas navegam sem perder o shell principal.
- Confirmar que as rotas de auditoria exigem as roles de analista.
- Confirmar que consultores nao veem `RowAuditHistoryButton`.
- Confirmar que `RowAuditHistoryButton` aparece nas tabelas listadas quando ha `entityId`.
- Confirmar que os filtros so consultam depois do submit.
- Confirmar que datas `datetime-local` sao enviadas em ISO UTC.
- Confirmar que o modal de historico seleciona automaticamente o primeiro evento.
- Confirmar que o detalhe mostra campos alterados, correlacao e payload completo.
- Confirmar que relatorios usam criacao assincrona e mostram download apenas quando `status === "DONE"`.
- Rodar pelo menos `npm test -- --run` ou o subset equivalente da feature, quando o ambiente permitir.
