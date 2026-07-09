# Teorema CAP por Domínio & Oportunidades de Autonomia — mcad

> Análise das dependências entre os domínios sob a ótica do Teorema CAP: qual postura cada
> microserviço assume diante de uma partição (queda de um vizinho ou da rede), e onde há
> oportunidade de aumentar a autonomia dos serviços substituindo acoplamento síncrono por
> réplicas locais alimentadas por eventos. Complementa `service-communication.md`, que
> descreve o *como* da comunicação; este documento analisa o *custo arquitetural* dela.

Data da análise: 2026-07-09 (código em `main`).

---

## Índice

1. [Nota sobre a aplicação do CAP](#1-nota-sobre-a-aplicação-do-cap)
2. [Mapa de dependências entre domínios](#2-mapa-de-dependências-entre-domínios)
3. [Classificação CAP por domínio](#3-classificação-cap-por-domínio)
4. [Síntese: AP com ilhas CP](#4-síntese-ap-com-ilhas-cp)
5. [Oportunidades de autonomia](#5-oportunidades-de-autonomia)
6. [Proposta A — Recorte local do Cadastro na Identificação](#6-proposta-a--recorte-local-do-cadastro-na-identificação)
7. [Proposta B — Resolução de pendentes dirigida por eventos](#7-proposta-b--resolução-de-pendentes-dirigida-por-eventos)
8. [Outras oportunidades avaliadas](#8-outras-oportunidades-avaliadas)
9. [Roteiro sugerido](#9-roteiro-sugerido)

---

## 1. Nota sobre a aplicação do CAP

O Teorema CAP, em sentido estrito, aplica-se a um armazenamento de dados distribuído: sob
partição de rede (P), escolhe-se entre consistência (C) e disponibilidade (A). Cada serviço
do mcad usa um PostgreSQL single-node (schema-per-service), então internamente nenhum deles
"escolhe" nada.

A leitura útil aqui é a **postura de cada domínio diante de uma partição entre serviços**:
quando um vizinho do qual ele depende fica inacessível, o domínio…

- **CP** — recusa a operação para não trabalhar com dado possivelmente incorreto
  (prefere consistência, sacrifica disponibilidade); ou
- **AP** — continua operando com uma cópia local possivelmente defasada
  (prefere disponibilidade, aceita consistência eventual).

---

## 2. Mapa de dependências entre domínios

### 2.1 Dependências síncronas (HTTP — acoplamento em tempo de requisição)

| Quem chama | Quem é chamado | Onde no código | Comportamento se o alvo cair |
|---|---|---|---|
| Identificação | Cadastro | `CadastroHttpClient` — usado em `CriarExecucaoCommandHandler`, `AtualizarExecucaoCommandHandler`, `ResolverPendenteCommandHandler`, `ResolverPendentesEmLoteCommandHandler`, `ValidarPreRequisitosQueryHandler` (fechamento de rol), `CsvProcessorWorker`, `PendentesVerificadorWorker` | Operação falha — não há fallback nem cache |
| Distribuição | Cadastro | `CadastroOwnershipClient` (snapshot de titularidade) chamado por `CalcularProcessoCommandHandler` e `CreditoRetidoLiberacaoService`; timeout de conexão 2s | Cálculo do processo falha com `CadastroIntegrationException` (métrica `integration-failure`) |
| Cadastro | ISWC API (externa) | `IswcService` | Criação/liberação de obra falha com `ExternalServiceException` |
| Identificação, Arrecadação | Storage/MinIO (externo) | `StorageServiceClient` / `HttpStorageFileClient` | Upload/download de arquivos falha |
| BFF | Todos os 4 domínios + authz + auditoria | `upstreams.ts` (composição de API) | A rota correspondente fica indisponível |

### 2.2 Dependências assíncronas (RabbitMQ via Outbox — consistência eventual)

| Consumidor | Eventos consumidos | Uso |
|---|---|---|
| Identificação | `arrecadacao.usuario-musica.criado/atualizado` | Réplica local (`UsuarioMusicaSnapshot`) |
| Identificação | `distribuicao.rol.processado` | Atualiza status da captação |
| Arrecadação | `distribuicao.processo.*` | Acompanha processos de cálculo |
| Distribuição | `identificacao.rol.fechado/cancelado` | Ingere rol para cálculo |
| Distribuição | `arrecadacao.rubrica.criada/atualizada`, `arrecadacao.verba.disponivel`, `arrecadacao.pagamento.estornado` | Projeções locais de rubricas/verbas |
| Todos | `identity.user.*` | Sincronização de usuários |

O Cadastro **apenas publica** (`cadastro.*` — transições de status de obra/fonograma,
`titular.criado`, ocorrências) e não consome nada dos outros três domínios.

### 2.3 Grafo (→ síncrono, ⇢ assíncrono)

```
Identificação ──→ Cadastro ──→ ISWC (externa)
Distribuição  ──→ Cadastro

Arrecadação   ⇢ Identificação   (usuario-musica.criado/atualizado)
Identificação ⇢ Distribuição    (rol.fechado/cancelado)
Arrecadação   ⇢ Distribuição    (rubrica.*, verba.disponivel, pagamento.estornado)
Distribuição  ⇢ Arrecadação     (processo.*)
Distribuição  ⇢ Identificação   (rol.processado)
```

---

## 3. Classificação CAP por domínio

### D01 Cadastro — CP (âncora de consistência)

Fonte de verdade de obras, fonogramas e titularidade. Não depende de nenhum outro domínio
para operar; depende sincronamente apenas da ISWC API — e prefere **recusar** a criação de
obra a criá-la sem ISWC válido. Todo o sistema trata o Cadastro como o ponto onde
consistência não se negocia: quem precisa de dado fresco dele o consulta sincronamente.

### D02 Identificação — híbrido, predominantemente CP

- **CP em relação ao Cadastro**: as escritas críticas (criar/editar execução, resolver
  pendente, validar pré-requisitos de fechamento de rol) validam obra/fonograma via HTTP em
  tempo real e **falham fechado** se o Cadastro estiver fora.
- **AP em relação à Arrecadação**: mantém réplica local de usuários de música
  (`UsuarioMusicaSnapshot`) alimentada por eventos; continua operando com dado
  eventualmente consistente se a Arrecadação cair.

### D03 Arrecadação — AP (o mais autônomo)

Nenhuma chamada síncrona a outro domínio (apenas ao Storage externo, para arquivos). Toda a
troca de dados inter-domínio é via eventos. Numa partição, continua criando rubricas,
registrando pagamentos e liberando verbas; o resto do sistema fica sabendo depois.
Disponibilidade máxima, consistência eventual.

### D04 Distribuição — híbrido, com CP deliberado no ponto crítico

- **AP para ingestão de insumos**: rol fechado, rubricas, verbas e estornos chegam por
  eventos e viram projeções locais — tolera defasagem.
- **CP no momento do cálculo**: busca sincronamente no Cadastro o snapshot de titularidade
  (`OwnershipSnapshot`) e prefere **falhar o processo** a calcular distribuição de dinheiro
  com percentuais possivelmente desatualizados. Escolha correta: errar valor financeiro por
  dado defasado seria pior do que atrasar o cálculo.

### BFF (não é domínio, mas participa do CAP operacional)

Composição síncrona: a disponibilidade de cada rota é o mínimo das disponibilidades dos
upstreams envolvidos.

---

## 4. Síntese: AP com ilhas CP

O sistema como um todo é **AP com ilhas CP**. A malha de eventos (Outbox + RabbitMQ)
garante que nenhum domínio trava esperando outro no fluxo cotidiano, ao custo de
consistência eventual entre schemas. As exceções — validação de obra na Identificação e
snapshot de titularidade no cálculo da Distribuição — são pontos onde dado desatualizado do
Cadastro teria consequência de negócio inaceitável, e ali os serviços sacrificam
disponibilidade conscientemente.

**Ponto único de fragilidade real: o Cadastro.** Uma queda dele degrada as escritas da
Identificação e paralisa os cálculos da Distribuição, enquanto a Arrecadação segue intacta.

---

## 5. Oportunidades de autonomia

Critério: reduzir o raio de explosão de uma queda do Cadastro, preservando as garantias de
consistência onde elas têm consequência financeira. Duas propostas principais (detalhadas
nas seções 6 e 7) e duas avaliadas e adiadas (seção 8).

| # | Proposta | Ganho de autonomia | Complexidade | Risco de consistência |
|---|---|---|---|---|
| A | Recorte local do Cadastro na Identificação (réplica por eventos) | Alto — remove todas as chamadas síncronas Identificação→Cadastro | Média-alta | Baixo-médio (janela de defasagem em validações) |
| B | Resolução de pendentes dirigida por eventos | Médio — elimina polling e reage em tempo quase real | Baixa | Nenhum (é melhoria pura) |
| C | Réplica de titularidade na Distribuição | Alto em teoria | Alta | **Alto — financeiro; não recomendado** |
| D | Cache/fallback do ISWC no Cadastro | Baixo | Baixa | Baixo |

---

## 6. Proposta A — Recorte local do Cadastro na Identificação

### 6.1 Ideia

A Identificação passa a manter tabelas-snapshot `obra_snapshot` e `fonograma_snapshot` no
próprio schema, alimentadas por eventos do Cadastro. Todas as validações e buscas que hoje
fazem HTTP (`CadastroHttpClient`) passam a consultar o recorte local. A Identificação vira
AP em relação ao Cadastro: uma queda dele deixa o recorte defasado, mas não paralisa
digitação de execuções, resolução de pendentes nem processamento de CSV.

**Precedente interno**: o padrão já existe e funciona — `UsuarioMusicaSnapshot` +
`ArrecadacaoUsuarioMusicaEventConsumer` + `UsuarioMusicaSnapshotRepository`. A implementação
é replicar esse desenho para obras/fonogramas.

### 6.2 O que o recorte precisa conter (derivado do uso atual)

| Entidade | Campos usados hoje | Fonte no client atual |
|---|---|---|
| Obra | `Id, Titulo, Iswc, Status` | `ObraResumoDto` |
| Fonograma | `Id, ObraId, Titulo, Isrc, Interpretes, Status` | `FonogramaResumoDto` |
| Busca textual | match por título / ISRC / ISWC (usada no `CsvProcessorWorker`) | `BuscarAsync` |

### 6.3 Mapa de complexidade

**C1 — Gap de eventos no Cadastro (a maior parte do trabalho).**
Os eventos atuais cobrem apenas *transições de status* e não formam um stream completo de
replicação:

- Não existem `cadastro.obra.criada`, `cadastro.obra.atualizada`,
  `cadastro.fonograma.criado`, `cadastro.fonograma.atualizado`. Sem eles, obras em rascunho
  e alterações de título/ISWC nunca chegam à réplica.
- Payloads insuficientes: `fonograma.liberado` carrega só `fonogramaId, obraId, isrc` —
  **falta `titulo` e `interpretes`**, usados na resolução de pendentes. `obra.liberada`
  (`obraId, titulo, iswc`) está quase completo.
- Decisão de desenho: enriquecer os eventos existentes (quebra de contrato — os `asyncapi`
  são handwritten e versionados no contract gate) **ou** criar eventos novos de replicação
  (ex.: `cadastro.obra.snapshot.v1`) mantendo os atuais como eventos de negócio. A segunda
  opção evita quebrar os consumidores existentes (Distribuição não consome `cadastro.*`
  hoje, então o risco real é baixo, mas o contrato é público).

**C2 — Carga inicial (backfill).**
Eventos só cobrem o futuro; o estoque existente de obras/fonogramas precisa de seed:
endpoint de export paginado no Cadastro + comando de carga na Identificação, ou
republicação em massa pelo outbox. Precisa ser idempotente e reexecutável.

**C3 — Ordering e idempotência no consumer.**
Eventos podem chegar fora de ordem (ex.: `bloqueada` antes de `liberada` re-entregue).
Mitigação: incluir versão/sequência ou timestamp de origem no payload e aplicar
*last-writer-wins* por versão — upsert condicional no snapshot. O consumer de
usuário-música atual já faz upsert; falta o guarda de versão.

**C4 — Paridade da busca textual.**
`BuscarAsync` hoje delega o matching ao Cadastro (relevância, normalização). Reproduzir
localmente exige índice próprio (`pg_trgm` ou `tsvector` no schema da Identificação) e
aceitar que o comportamento de match do CSV pode divergir sutilmente do atual. Vale
congelar casos de teste do matching atual antes de migrar (golden tests com os CSVs de QA).

**C5 — Semântica de consistência eventual nas validações críticas.**
Com a réplica, dois cenários novos aparecem:

- Execução criada contra obra **recém-bloqueada** (evento ainda em trânsito) → aceita
  indevidamente. Mitigação: a janela é de segundos (outbox poll 5s) e o fluxo de pendentes/
  re-verificação corrige a posteriori; é o mesmo trade-off já aceito para usuários de música.
- Obra **recém-liberada** ainda não visível → cai em pendente em vez de identificar.
  Autocorrige via Proposta B (evento `obra.liberada` re-dispara a verificação).

O ponto que merece decisão explícita de negócio é o **fechamento de rol**
(`ValidarPreRequisitosQueryHandler`): se o fechamento tem consequência a jusante
(Distribuição calcula em cima), pode-se manter **só essa** validação síncrona contra o
Cadastro — recorte para o dia a dia, verificação forte no ato de fechar. Híbrido barato que
preserva a garantia onde ela importa.

**C6 — Observabilidade e reconciliação.**
Réplica silenciosamente defasada é pior que chamada síncrona falhando alto. Necessário:
métrica de lag do consumer, alarme de fila acumulando e um job de reconciliação periódica
(comparar contagens/checksums recorte × Cadastro) — mesmo que rode 1×/dia.

**C7 — Contract gate e testes.**
Novos eventos → atualizar `contracts/cadastro/asyncapi.json` (handwritten), testes de
integração com Testcontainers para consumer + backfill, e ajustar os testes que hoje mockam
`ICadastroHttpClient` (a interface de domínio pode ser mantida e reimplementada sobre o
repositório do snapshot, minimizando o diff na camada de aplicação).

### 6.4 Estimativa de esforço

| Frente | Tamanho |
|---|---|
| Cadastro: novos eventos + payloads + outbox + asyncapi | M |
| Cadastro: endpoint/mecanismo de backfill | S–M |
| Identificação: tabelas snapshot + migrations + consumer idempotente | M (padrão já existe) |
| Identificação: reimplementar `ICadastroHttpClient` sobre o recorte + busca local | M |
| Golden tests de matching do CSV + reconciliação + métricas | S–M |

Total: uma feature de porte médio (comparável à réplica de usuário-música + a metade no
lado do Cadastro), entregável em fases — ver seção 9.

---

## 7. Proposta B — Resolução de pendentes dirigida por eventos

### 7.1 Situação atual

`PendentesVerificadorWorker` roda em loop: lista execuções pendentes com `ObraId`, consulta
o Cadastro via HTTP obra a obra (`GetObraByIdAsync` / `GetFonogramaByIdAsync`) e
auto-resolve as que ficaram elegíveis. É polling: gera carga constante no Cadastro,
reage com atraso e depende dele estar no ar.

### 7.2 Proposta

Inverter o gatilho: consumir `cadastro.obra.liberada` e `cadastro.fonograma.liberado`
(eventos que **já existem e já são publicados**) e, ao receber, re-verificar apenas os
pendentes daquela obra/fonograma. O worker de polling pode ser mantido com intervalo longo
como rede de segurança (reconciliação), ou desligado após estabilizar.

### 7.3 Mapa de complexidade — baixa

- Consumer novo na Identificação seguindo o molde do `DistribuicaoEventConsumer`
  (declaração de fila, bind em `cadastro.events`, ack/nack). Trabalho pequeno e padrão.
- `obra.liberada` já carrega `obraId, titulo, iswc` — suficiente para resolver pendentes de
  obra. Para fonograma, o payload atual (`fonogramaId, obraId, isrc`) **não traz
  `titulo`/`interpretes`**: ou enriquece o payload (mesma discussão C1 da Proposta A), ou o
  consumer faz um GET pontual ao receber o evento (mantém uma chamada HTTP, mas fora do
  caminho crítico e disparada por evento — degradação aceitável).
- Nenhum risco de consistência: o evento só *antecipa* o que o polling faria; a re-entrega
  do RabbitMQ + o worker de reconciliação cobrem perda de mensagem.
- Se a Proposta A for feita antes, esta proposta sai quase de graça: o consumer do recorte
  já recebe os eventos; basta encadear a re-verificação de pendentes após o upsert do
  snapshot.

É o melhor ponto de partida: baixo risco, elimina polling e prova o caminho de consumo de
`cadastro.events` pela Identificação.

---

## 8. Outras oportunidades avaliadas

### 8.1 Réplica de titularidade na Distribuição — não recomendado

Seria a versão da Proposta A para o `CadastroOwnershipClient`. Tecnicamente possível, mas o
CP ali é **deliberado**: o cálculo distribui dinheiro segundo percentuais de titularidade, e
calcular com réplica defasada significa pagar a pessoa errada — erro caro e de correção
trabalhosa (estornos/ajustes). O custo de indisponibilidade (cálculo atrasa e é reprocessado)
é muito menor que o custo de inconsistência. Se um dia a disponibilidade do Cadastro virar
gargalo real dos cálculos, a alternativa segura é *snapshot versionado com verificação de
frescor* (o Cadastro publica a versão corrente da titularidade; a Distribuição usa réplica
somente se a versão local for comprovadamente a mais recente) — complexidade alta, adiar até
haver dor concreta.

### 8.2 Cache/fallback do ISWC no Cadastro — melhoria pontual

A dependência síncrona do `IswcService` derruba a criação de obras quando o serviço externo
falha. Como o ISWC é imutável após atribuído, um fallback simples (criar a obra com ISWC
pendente e completar assincronamente, ou retry em background) tornaria o Cadastro imune à
ISWC API. Muda o fluxo de negócio (obra existiria temporariamente sem ISWC), então requer
decisão de produto — registrada aqui como opção, não como recomendação.

---

## 9. Roteiro sugerido

Ordem que minimiza risco e entrega valor incremental:

1. **Fase 1 — Proposta B (pendentes por eventos).** Baixo risco, eventos já existem,
   estabelece o consumo de `cadastro.events` pela Identificação. Polling vira reconciliação.
2. **Fase 2 — Eventos de replicação no Cadastro.** `obra.criada/atualizada`,
   `fonograma.criado/atualizado` (ou `*.snapshot.v1`), payloads completos com versão para
   idempotência, asyncapi + contract gate, backfill.
3. **Fase 3 — Recorte na Identificação.** Tabelas snapshot + consumer + busca local;
   reimplementar `ICadastroHttpClient` sobre o recorte atrás de feature flag, com golden
   tests do matching de CSV; manter validação síncrona apenas no fechamento de rol (decisão
   de negócio a confirmar).
4. **Fase 4 — Desligamento gradual.** Métricas de lag + reconciliação diária rodando;
   remover as chamadas HTTP restantes quando a paridade estiver comprovada.

Resultado esperado ao final: a Identificação passa de "predominantemente CP" para "AP com
verificação forte no fechamento", e uma queda do Cadastro deixa de afetar o dia a dia de
identificação de execuções — restando como ilha CP apenas o que deve mesmo ser CP: o
cálculo financeiro da Distribuição e (opcionalmente) o fechamento de rol.
