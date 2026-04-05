---
status: pending
parallelizable: false
blocked_by: ["2.0", "3.0"]
---

<task_context>
<domain>tooling/load-test</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Cenários — cicloCompleto + obraSemFonograma + edicao + depuracao + bloqueio

## Visão Geral

Implementar os 5 cenários de simulação usando os helpers (api, generators, pool, metrics). Cada cenário é uma função exportada chamada pelo orquestrador do main.js.

## Arquivos Envolvidos

- **Criar:**
  - `services/load-test/scripts/scenarios/cicloCompleto.js`
  - `services/load-test/scripts/scenarios/obraSemFonograma.js`
  - `services/load-test/scripts/scenarios/edicao.js`
  - `services/load-test/scripts/scenarios/depuracao.js`
  - `services/load-test/scripts/scenarios/bloqueio.js`

## Subtarefas

- [ ] 4.1 **cicloCompleto.js (60%):** Criar/reutilizar titular → criar obra → 2-3 titularidades (percentuais somam 100%) → obter ISWC → criar fonograma → 3-4 participações (intérprete + produtor + músico(s)) → calcular → urlAudio → liberar obra → liberar fonograma. Pace: sleep 2-3s entre calls. Adicionar ao pool.
- [ ] 4.2 **obraSemFonograma.js (15%):** Criar obra → titularidades → ISWC. Fonograma será adicionado por outro ciclo futuro que pega obra do pool.
- [ ] 4.3 **edicao.js (10%):** Se pool tem entidades: selecionar aleatório (titular, obra PENDENTE, ou fonograma PENDENTE) → editar campo (nome, título/gênero, país). Se pool vazio: fallback para cicloCompleto.
- [ ] 4.4 **depuracao.js (10%):** Se pool tem obra/fono LIBERADO: selecionar → depurar (POST /depurar com título/ISRC alterado) → adicionar nova entidade ao pool. Se nenhum LIBERADO: fallback para cicloCompleto.
- [ ] 4.5 **bloqueio.js (5%):** Se pool tem entidade PENDENTE/LIBERADA: bloquear (justificativa aleatória) → sleep 5-10s → desbloquear. Incrementar counter.
- [ ] 4.6 Atualizar main.js para importar cenários reais (remover placeholders)

## Detalhes de Implementação

### Titularidades — Soma = 100%
```javascript
function distribuirPercentuais(n) {
  // Gera n percentuais que somam 100%
  const parts = [];
  let remaining = 10000; // 100% em centésimos de %
  for (let i = 0; i < n - 1; i++) {
    const max = remaining - (n - i - 1) * 100; // mín 1% por restante
    const part = randomIntBetween(1000, Math.min(max, 6000));
    parts.push(part / 100);
    remaining -= part;
  }
  parts.push(remaining / 100);
  return parts; // ex: [45.00, 30.00, 25.00]
}
```

### Depuração — Fluxo PUT → 409 → POST /depurar
```javascript
// Tentar editar título da obra LIBERADA
const res = api.put(`/obras/${obra.id}`, { ...obra, titulo: gen.titulo() });
if (res.status === 409) {
  // Depuração necessária — confirmar
  const depRes = api.post(`/obras/${obra.id}/depurar`, {
    titulo: gen.titulo(),
    tipo: obra.tipo,
    genero: obra.genero,
  });
  const result = JSON.parse(depRes.body);
  pool.obras.push(result.novaObra);
  metrics.depuracoes.add(1);
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] cicloCompleto cria 1 obra + 1 fonograma com todos os vínculos
- [ ] Titularidades sempre somam 100%
- [ ] Participações incluem ≥1 intérprete + ≥1 produtor (calcular funciona)
- [ ] Depuração gera nova entidade no pool
- [ ] Bloqueio + desbloqueio funciona sem erros
