/**
 * Cenário E — Bloqueio/Desbloqueio (5%)
 *
 * Seleciona entidade existente → bloqueia com justificativa → aguarda delay → desbloqueia.
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { gen, randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { metrics } from '../helpers/metrics.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
}

export function bloqueio() {
  // Seleciona obra ou fonograma aleatoriamente
  const opcoes = [];
  if (pool.obras.length > 0) opcoes.push('obra');
  if (pool.fonogramas.length > 0) opcoes.push('fonograma');

  if (opcoes.length === 0) {
    console.log('[bloqueio] Pool de obras/fonogramas vazio ainda');
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

    // Delay simulando tempo de análise (5-15 segundos / pace_multiplier)
    sleep(randomIntBetween(5, 15) / PACE_MULTIPLIER);

    // Desbloquear
    api.post(`${basePath}/${entidade.id}/desbloquear`, {
      justificativa: 'Analise concluida, sem irregularidades',
    });
  }
}
