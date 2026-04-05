---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>tooling/load-test</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Data — nomes.json + titulos.json + generos.json

## Visão Geral

Criar os 3 arquivos JSON com dados realistas brasileiros para geração de dados.

## Arquivos Envolvidos

- **Criar:**
  - `services/load-test/scripts/data/nomes.json` — `{ "nomes": ["Ana", "Bruno", "Carlos", ...], "sobrenomes": ["Silva", "Santos", "Oliveira", ...] }` (~200 cada)
  - `services/load-test/scripts/data/titulos.json` — `{ "adjetivos": ["Saudade", "Noite", "Amor", "Último", ...], "substantivos": ["do Mar", "de Verão", "Perdido", "Azul", ...] }` (~100 cada)
  - `services/load-test/scripts/data/generos.json` — `["MPB", "Samba", "Sertanejo", "Forró", "Rock", "Pop", "Funk", "Gospel", "Pagode", "Axé"]`

## Subtarefas

- [ ] 3.1 nomes.json: ~200 nomes brasileiros comuns + ~200 sobrenomes brasileiros comuns
- [ ] 3.2 titulos.json: ~100 adjetivos/palavras iniciais + ~100 substantivos/complementos para gerar títulos de músicas brasileiras realistas
- [ ] 3.3 generos.json: 10 gêneros musicais brasileiros

## Critérios de Sucesso (Verificáveis)

- [ ] Combinação aleatória gera títulos realistas (ex: "Saudade do Mar", "Noite de Verão")
- [ ] Nomes compostos realistas (ex: "Ana Carolina Silva", "Bruno Santos Oliveira")
