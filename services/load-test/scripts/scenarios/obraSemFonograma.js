/**
 * Cenário B — Obra sem Fonograma (15%)
 *
 * Fluxo: criar obra → titularidades (2-3) → obter ISWC
 * O fonograma será criado em ciclo futuro.
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

export function obraSemFonograma() {
  // Necessita ao menos um titular no pool
  if (pool.titulares.length === 0) {
    const data = gen.titular();
    const res = api.post('/titulares', data);
    if (res.status >= 200 && res.status < 300) {
      const titular = JSON.parse(res.body);
      pool.titulares.push(titular);
      metrics.titularesCriados.add(1);
    } else {
      return;
    }
    pace();
  }

  // 1. Criar obra
  const obraData = gen.obra();
  const obraRes = api.post('/obras', obraData);
  if (obraRes.status < 200 || obraRes.status >= 300) return;
  const obra = JSON.parse(obraRes.body);
  metrics.obrasCriadas.add(1);
  pace();

  // 2. Titularidades (2-3)
  const numTitularidades = randomIntBetween(2, 3);
  const titulares = pool.getTitularesAleatorios(numTitularidades);
  const listaTitulares = titulares.length > 0 ? titulares : [randomItem(pool.titulares)];

  let percentualRestante = 100;
  for (let i = 0; i < listaTitulares.length; i++) {
    const isUltimo = i === listaTitulares.length - 1;
    const pct = isUltimo
      ? percentualRestante
      : Math.min(randomIntBetween(20, 60), percentualRestante - (listaTitulares.length - i - 1) * 5);
    percentualRestante -= pct;

    const t = listaTitulares[i];
    api.post(`/obras/${obra.id}/titularidades`, {
      titularId: t.id,
      categoria: t.tipo === 'PJ' ? 'EDITOR' : 'AUTOR',
      percentual: Math.round(pct * 10000) / 10000,
    });
    pace();
  }

  // 3. Obter ISWC
  api.post(`/obras/${obra.id}/iswc`, {});

  // Obra sem fonograma — marcada como não liberada
  obra._liberada = false;
  pool.obras.push(obra);
}
