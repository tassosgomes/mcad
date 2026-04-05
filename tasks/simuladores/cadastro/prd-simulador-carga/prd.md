# PRD — Simulador de Carga (Robô de Cadastro)

> **Tipo:** Ferramenta de Suporte
> **Prioridade:** Should Have
> **Status:** `planned`
> **Data:** 2026-04-05

---

## Visão Geral

Simulador automatizado que gera dados realistas no domínio Cadastro, simulando 20 usuários virtuais operando em paralelo com ritmo acelerado (5x human pace). O objetivo é atingir **1 milhão de registros** (obras + fonogramas) em ~16 dias para validar performance, paginação, índices e comportamento do sistema sob volume.

O simulador executa via **container Docker** (k6 + imagem oficial `grafana/k6`) e chama a API REST do cadastro-api, simulando o fluxo completo de cadastro: criar titulares → obras → titularidades → ISWC → fonogramas → participações conexas → calcular → liberar. Inclui operações de edição, depuração e bloqueio para simular uso real.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Gerar 1M entidades (obras + fonogramas) | Contagem no banco atinge 1M |
| Simular uso realista | Mix de operações: 60% create, 15% create parcial, 10% edit, 10% depurar, 5% bloquear |
| 20 usuários simultâneos | k6 com 20 VUs rodando em paralelo |
| Ritmo acelerado 5x | ~2-3s delay entre calls (não zero, não human pace) |
| Container standalone | `docker run` sem dependências externas (exceto API + DB) |
| Métricas de execução | Requests/s, latência p95, erros, entidades criadas |

---

## Histórias de Usuário

### HU-01 — Gerar volume para teste de performance
**Como** Arquiteto,
**eu quero** gerar 1M de registros realistas no Cadastro,
**para que** eu valide que paginação, índices e queries funcionam sob volume.

### HU-02 — Simular uso concorrente
**Como** Tech Lead,
**eu quero** simular 20 usuários operando simultaneamente,
**para que** eu identifique problemas de concorrência (deadlocks, sequences, unique violations).

### HU-03 — Rodar como container
**Como** DevOps,
**eu quero** rodar o simulador via `docker run` com variáveis de ambiente,
**para que** eu não precise instalar ferramentas localmente.

---

## Funcionalidades Principais

### 1. Cenários de Simulação

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | **Cenário A — Ciclo Completo (60%):** Criar titular (se pool < 500) → criar obra → adicionar 2-3 titularidades → obter ISWC → criar fonograma → adicionar 3-4 participações → calcular → liberar obra → liberar fonograma | Must Have |
| RF-02 | **Cenário B — Obra sem fonograma (15%):** Criar obra → titularidades → ISWC. Fonograma será criado em ciclo futuro. | Must Have |
| RF-03 | **Cenário C — Edição (10%):** Selecionar entidade existente aleatória → editar campos (nome titular, título obra, país fonograma) | Must Have |
| RF-04 | **Cenário D — Depuração (10%):** Selecionar obra ou fonograma LIBERADO → depurar (gera nova entidade) | Must Have |
| RF-05 | **Cenário E — Bloqueio/Desbloqueio (5%):** Selecionar entidade → bloquear com justificativa → desbloquear após delay | Must Have |

### 2. Geração de Dados

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Nomes de titulares gerados aleatoriamente (lista de nomes/sobrenomes brasileiros) | Must Have |
| RF-07 | CPFs gerados válidos (algoritmo módulo 11) | Must Have |
| RF-08 | CNPJs gerados válidos (módulo 11, numérico) | Must Have |
| RF-09 | Títulos de obras gerados por combinação de palavras (ex: "Saudade do Mar", "Noite de Verão") | Must Have |
| RF-10 | ISRCs gerados no formato válido (BR + registrante aleatório + ano + sequencial) | Must Have |
| RF-11 | Distribuição de tipos: PF 80%, PJ 20% (editoras/gravadoras) | Must Have |
| RF-12 | Associação selecionada aleatoriamente entre as 7 existentes | Must Have |
| RF-13 | Gêneros selecionados de lista fixa (MPB, Samba, Sertanejo, Forró, Rock, Pop, Funk, Gospel, Pagode, Axé) | Must Have |
| RF-14 | Tipos de obra: 70% LITEROMUSICAL, 20% MUSICAL, 5% VERSAO, 5% POT_POURRI | Must Have |

### 3. Controle de Ritmo

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-15 | Delay entre API calls: 2-3 segundos (aleatório, distribuição uniforme) | Must Have |
| RF-16 | 20 VUs (virtual users) simultâneos | Must Have |
| RF-17 | Execução contínua (duração configurável via env var, default 16 dias) | Must Have |
| RF-18 | Think time entre cenários: 5-10 segundos | Must Have |

### 4. Container e Configuração

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-19 | Dockerfile baseado em `grafana/k6` com scripts embutidos | Must Have |
| RF-20 | Configuração via variáveis de ambiente: `API_BASE_URL`, `VUS`, `DURATION`, `PACE_MULTIPLIER` | Must Have |
| RF-21 | `docker-compose.yml` ou `docker run` documentado | Must Have |

### 5. Métricas e Observabilidade

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-22 | k6 summary no final: requests totais, taxa de erro, latência p50/p95/p99 | Must Have |
| RF-23 | Counter customizado: entidades criadas por tipo (obras, fonogramas, titulares) | Must Have |
| RF-24 | Log de progresso a cada 1.000 entidades criadas | Must Have |
| RF-25 | Se taxa de erro > 5%, pausar e logar warning | Should Have |

---

## Não-Objetivos

- Não é teste de stress (não busca derrubar a API)
- Não testa frontend (apenas API REST)
- Não gera dados para outros domínios (Identificação, Arrecadação, Distribuição)
- Não roda em CI/CD (ferramenta manual)
- Não precisa de autenticação (roda com AUTH_ENABLED=false ou token fixo)

---

## Projeção de Volume

| Métrica | Valor |
|---------|-------|
| Delay entre calls | 2-3s |
| Ciclo completo | ~42s |
| Ciclos/usuário/hora | ~85 |
| Entidades/usuário/hora | ~128 |
| **20 usuários/dia** | **~61.000** |
| **Tempo para 1M** | **~16 dias** |

---

## Questões em Aberto

Todas resolvidas. PRD pronto.

---

*PRD gerado.*
