/**
 * Cenário E — Bloqueio/Desbloqueio (5%)
 *
 * Se pool tem entidade PENDENTE ou LIBERADA:
 *   1. Bloqueia com justificativa aleatória
 *   2. Aguarda 5-10s (simulando análise)
 *   3. Desbloqueia
 *   4. Incrementa counter de bloqueios
 *
 * Se pool vazio: fallback para cicloCompleto.
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { gen, randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { metrics } from '../helpers/metrics.js';
import { cicloCompleto } from './cicloCompleto.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
}

export function bloqueio() {
  // Monta lista de opções — qualquer entidade (PENDENTE ou LIBERADA)
  const opcoes = [];
  if (pool.obras.length > 0) opcoes.push('obra');
  if (pool.fonogramas.length > 0) opcoes.push('fonograma');

  // Fallback: pool sem obras nem fonogramas
  if (opcoes.length === 0) {
    console.log('[bloqueio] Pool de obras/fonogramas vazio — fallback para cicloCompleto');
    cicloCompleto();
    return;
  }

  const tipo = randomItem(opcoes);
  const entidade = tipo === 'obra'
    ? randomItem(pool.obras)
    : randomItem(pool.fonogramas);

  const justificativa = gen.justificativaBloqueio();
  const basePath = tipo === 'obra' ? '/obras' : '/fonogramas';

  // Bloquear
  const bloqueioRes = api.post(`${basePath}/${entidade.id}/bloquear`, {
    justificativa,
  });

  if (bloqueioRes.status >= 200 && bloqueioRes.status < 300) {
    metrics.bloqueios.add(1);
    pace();

    // Delay simulando tempo de análise: 5-10 segundos (ajustado por pace_multiplier)
    sleep(randomIntBetween(5, 10) / PACE_MULTIPLIER);

    // Desbloquear após análise
    api.post(`${basePath}/${entidade.id}/desbloquear`, {
      justificativa: 'Analise concluida, sem irregularidades',
    });
  } else {
    console.log(`[bloqueio] Falha ao bloquear ${tipo}/${entidade.id}: status=${bloqueioRes.status}`);
  }
}
