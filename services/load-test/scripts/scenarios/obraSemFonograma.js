/**
 * Cenário B — Obra sem Fonograma (15%)
 *
 * Fluxo: criar obra → titularidades (2-3, soma 100%) → obter ISWC.
 * O fonograma será criado em ciclo futuro por outro VU que pega obra do pool.
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

/**
 * Gera n percentuais que somam exatamente 100%.
 * Mesma lógica do cicloCompleto para consistência.
 *
 * @param {number} n
 * @returns {number[]}
 */
function distribuirPercentuais(n) {
  const parts = [];
  let remaining = 10000;

  for (let i = 0; i < n - 1; i++) {
    const min = 100;
    const max = remaining - (n - i - 1) * min;
    const limit = Math.min(max, 6000);
    if (limit <= min) {
      parts.push(min / 100);
      remaining -= min;
    } else {
      const part = randomIntBetween(min, limit);
      parts.push(part / 100);
      remaining -= part;
    }
  }

  parts.push(Math.round(remaining) / 100);
  return parts;
}

export function obraSemFonograma() {
  // Necessita ao menos um titular no pool — cria se não existir
  if (pool.titulares.length === 0) {
    const data = gen.titular();
    const res = api.post('/titulares', data);
    if (res.status >= 200 && res.status < 300) {
      const titular = JSON.parse(res.body);
      pool.titulares.push(titular);
      metrics.titularesCriados.add(1);
    } else {
      return; // sem titular, abandona cenário
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

  // 2. Titularidades (2-3): percentuais que somam exatamente 100%
  const numTitularidades = randomIntBetween(2, 3);
  const titularesDisp = pool.titulares.length >= numTitularidades
    ? pool.getTitularesAleatorios(numTitularidades)
    : [randomItem(pool.titulares)];

  const percentuais = distribuirPercentuais(titularesDisp.length);

  for (let i = 0; i < titularesDisp.length; i++) {
    const t = titularesDisp[i];
    api.post(`/obras/${obra.id}/titularidades`, {
      titularId: t.id,
      categoria: t.tipo === 'PJ' ? 'EDITOR' : 'AUTOR',
      percentual: percentuais[i],
    });
    pace();
  }

  // 3. Obter ISWC — tolerante porque depende de serviço externo (pode retornar 502)
  // Nota: AtribuirIswc no domain muda o status da obra para LIBERADO automaticamente.
  // Por isso, _liberada é definida como true se ISWC foi obtido com sucesso.
  const iswcRes = api.postTolerant(`/obras/${obra.id}/iswc`, {});
  obra._liberada = iswcRes.status >= 200 && iswcRes.status < 300;

  pool.obras.push(obra);
}
