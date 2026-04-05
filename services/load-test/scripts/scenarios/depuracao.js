/**
 * Cenário D — Depuração (10%)
 *
 * Seleciona uma obra ou fonograma LIBERADO do pool e executa depuração
 * (gera nova entidade derivada).
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { metrics } from '../helpers/metrics.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
}

export function depuracao() {
  // Tenta selecionar obra ou fonograma liberado
  const tirarDaObra = Math.random() < 0.5;

  if (tirarDaObra) {
    const obra = pool.getObraLiberadaAleatoria();
    if (!obra) {
      console.log('[depuracao] Nenhuma obra liberada disponivel ainda');
      return;
    }
    const res = api.post(`/obras/${obra.id}/depurar`, {});
    if (res.status >= 200 && res.status < 300) {
      const novaObra = JSON.parse(res.body);
      novaObra._liberada = false;
      pool.obras.push(novaObra);
      metrics.depuracoes.add(1);
      metrics.obrasCriadas.add(1);
      pace();
    }
  } else {
    const fono = pool.getFonogramaLiberadoAleatorio();
    if (!fono) {
      console.log('[depuracao] Nenhum fonograma liberado disponivel ainda');
      return;
    }
    const res = api.post(`/fonogramas/${fono.id}/depurar`, {});
    if (res.status >= 200 && res.status < 300) {
      const novoFono = JSON.parse(res.body);
      novoFono._liberado = false;
      pool.fonogramas.push(novoFono);
      metrics.depuracoes.add(1);
      metrics.fonogramasCriados.add(1);
      pace();
    }
  }
}
