/**
 * Cenário A — Ciclo Completo (60%)
 *
 * Fluxo: criar titular (se pool < 500) → criar obra → titularidades (2-3, soma 100%) →
 *        obter ISWC → criar fonograma → participações (3-4, ≥1 interprete + ≥1 produtor) →
 *        calcular → url áudio → liberar obra → liberar fonograma
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
 * Gera n percentuais inteiros (centésimos de %) que somam exatamente 100%.
 * Mínimo de 1% por participante (100 centésimos), máximo de 60% (6000 centésimos).
 *
 * @param {number} n - Número de percentuais a gerar
 * @returns {number[]} - Array com n valores em percentual (ex: [45.00, 30.00, 25.00])
 */
function distribuirPercentuais(n) {
  const parts = [];
  let remaining = 10000; // 100% em centésimos de %

  for (let i = 0; i < n - 1; i++) {
    // Garante que os restantes consigam ter pelo menos 1% cada
    const min = 100; // 1%
    const max = remaining - (n - i - 1) * min;
    const limit = Math.min(max, 6000); // máximo 60%
    if (limit <= min) {
      parts.push(min / 100);
      remaining -= min;
    } else {
      const part = randomIntBetween(min, limit);
      parts.push(part / 100);
      remaining -= part;
    }
  }

  parts.push(Math.round(remaining) / 100); // último recebe o restante exato
  return parts; // ex: [45.00, 30.00, 25.00]
}

export function cicloCompleto() {
  // 1. Titular: reutiliza do pool ou cria novo se pool < 500
  let titular;
  if (pool.titulares.length < 500) {
    const data = gen.titular();
    const res = api.post('/titulares', data);
    if (res.status >= 200 && res.status < 300) {
      titular = JSON.parse(res.body);
      pool.titulares.push(titular);
      metrics.titularesCriados.add(1);
    } else if (pool.titulares.length > 0) {
      titular = randomItem(pool.titulares);
    } else {
      return; // sem titulares disponíveis, abandona ciclo
    }
    pace();
  } else {
    titular = randomItem(pool.titulares);
  }

  // 2. Criar obra
  const obraData = gen.obra();
  const obraRes = api.post('/obras', obraData);
  if (obraRes.status < 200 || obraRes.status >= 300) return;
  const obra = JSON.parse(obraRes.body);
  metrics.obrasCriadas.add(1);
  pace();

  // 3. Titularidades (2-3): percentuais gerados somando exatamente 100%
  const numTitularidades = randomIntBetween(2, 3);
  const titularesDisp = pool.titulares.length >= numTitularidades
    ? pool.getTitularesAleatorios(numTitularidades)
    : [titular];

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

  // 4. Obter ISWC
  api.post(`/obras/${obra.id}/iswc`, {});
  pace();

  // 5. Criar fonograma
  const fonoData = gen.fonograma(obra.id);
  const fonoRes = api.post('/fonogramas', fonoData);
  if (fonoRes.status < 200 || fonoRes.status >= 300) {
    // Obra criada mas fonograma falhou — salva obra como pendente
    obra._liberada = false;
    pool.obras.push(obra);
    return;
  }
  const fono = JSON.parse(fonoRes.body);
  metrics.fonogramasCriados.add(1);
  pace();

  // 6. Participações (3-4): garantir ≥1 INTERPRETE e ≥1 PRODUTOR_FONOGRAFICO
  const numParticipacoes = randomIntBetween(3, 4);

  // Posições fixas: [0] = INTERPRETE, [1] = PRODUTOR_FONOGRAFICO, [2+] = MUSICO_EXECUTANTE
  const categoriasPorPosicao = (i) => {
    if (i === 0) return 'INTERPRETE';
    if (i === 1) return 'PRODUTOR_FONOGRAFICO';
    return 'MUSICO_EXECUTANTE';
  };

  for (let i = 0; i < numParticipacoes; i++) {
    const participante = randomItem(pool.titulares);
    api.post(`/fonogramas/${fono.id}/participacoes`, {
      titularId: participante.id,
      categoria: categoriasPorPosicao(i),
    });
    pace();
  }

  // 7. Calcular participações (requer ≥1 INTERPRETE + ≥1 PRODUTOR para funcionar)
  api.post(`/fonogramas/${fono.id}/participacoes/calcular`, {});
  pace();

  // 8. URL de áudio
  api.put(`/fonogramas/${fono.id}`, {
    ...fonoData,
    urlAudio: `https://storage.ecad.org.br/audio/${fono.isrc}.mp3`,
  });
  pace();

  // 9. Liberar obra
  const liberaObraRes = api.post(`/obras/${obra.id}/liberar`, {});
  obra._liberada = liberaObraRes.status >= 200 && liberaObraRes.status < 300;
  pool.obras.push(obra);
  pace();

  // 10. Liberar fonograma
  const liberaFonoRes = api.post(`/fonogramas/${fono.id}/liberar`, {});
  fono._liberado = liberaFonoRes.status >= 200 && liberaFonoRes.status < 300;
  pool.fonogramas.push(fono);
}
