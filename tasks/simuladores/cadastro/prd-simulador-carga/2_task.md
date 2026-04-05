---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>tooling/load-test</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"3.0, 4.0"</unblocks>
</task_context>

# Tarefa 2.0: Helpers — api.js + generators.js + pool.js + metrics.js

## Visão Geral

Criar os 4 módulos auxiliares: HTTP client com base URL e response checks, geradores de dados brasileiros válidos (CPF módulo 11, CNPJ módulo 11 numérico, nomes compostos, títulos de obras, ISRC formato válido), pool de entidades reutilizáveis por VU, e counters k6 customizados.

## Arquivos Envolvidos

- **Criar:**
  - `services/load-test/scripts/helpers/api.js`
  - `services/load-test/scripts/helpers/generators.js`
  - `services/load-test/scripts/helpers/pool.js`
  - `services/load-test/scripts/helpers/metrics.js`

## Subtarefas

- [ ] 2.1 **api.js:** `post(path, body)`, `put(path, body)`, `get(path)`, `del(path)`. Base URL do env. Headers Content-Type JSON. `check()` k6 para status 2xx. Retorna response.
- [ ] 2.2 **generators.js:**
  - `gerarCpf()` — 9 dígitos aleatórios + 2 dígitos verificadores (módulo 11)
  - `gerarCnpj()` — 12 dígitos aleatórios + 2 DVs (módulo 11 numérico)
  - `gerarNome()` — nome + sobrenome de listas
  - `gerarNomePJ()` — "Editora {sobrenome} Music Ltda"
  - `gerarTitulo()` — "{adjetivo} {substantivo}" de listas
  - `gerarIsrc()` — "BR" + 3 chars aleatórios + 2 dígitos ano + 5 dígitos número
  - `gerarGenero()` — aleatório da lista
  - `gerarTipoObra()` — ponderado (70% LITEROMUSICAL, 20% MUSICAL, 5% VERSAO, 5% POT_POURRI)
  - `titular()` — objeto completo com nome, tipo, documento, nacionalidade, associacaoId
  - `obra()` — objeto completo com titulo, tipo, genero
  - `fonograma(obraId)` — objeto completo com isrc, obraId, paisOrigem, datas
- [ ] 2.3 **pool.js:** arrays por VU (titulares, obras, fonogramas, associacoes). Setup function que carrega associações via GET /associacoes. `getTitularesAleatorios(n)` para seleção aleatória sem repetição.
- [ ] 2.4 **metrics.js:** k6 Counters: `obras_criadas`, `fonogramas_criados`, `titulares_criados`, `depuracoes`, `bloqueios`.

## Critérios de Sucesso (Verificáveis)

- [ ] `gerarCpf()` gera CPFs válidos (testar com algoritmo de validação)
- [ ] `gerarCnpj()` gera CNPJs válidos
- [ ] `gerarIsrc()` gera formato `BRABC2312345` (12 chars, 2 letras + 3 alfanum + 2 dígitos + 5 dígitos)
- [ ] Pool carrega 7 associações no setup
