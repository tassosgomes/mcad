/**
 * Cenário A — Ciclo Completo (60%)
 *
 * Fluxo: criar titular (se pool < 500) → criar obra → titularidades (2-3) →
 *        obter ISWC → criar fonograma → participações (3-4) → calcular →
 *        url áudio → liberar obra → liberar fonograma
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { gen, randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { metrics } from '../helpers/metrics.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  // 2-3 segundos entre calls, ajustado pelo PACE_MULTIPLIER
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
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

  // 3. Titularidades (2-3)
  const numTitularidades = randomIntBetween(2, 3);
  const titularesDisponiveis = pool.titulares.length >= numTitularidades
    ? pool.getTitularesAleatorios(numTitularidades)
    : [titular];

  let percentualRestante = 100;
  for (let i = 0; i < titularesDisponiveis.length; i++) {
    const isUltimo = i === titularesDisponiveis.length - 1;
    const pct = isUltimo
      ? percentualRestante
      : Math.min(randomIntBetween(20, 60), percentualRestante - (titularesDisponiveis.length - i - 1) * 5);
    percentualRestante -= pct;

    const t = titularesDisponiveis[i];
    api.post(`/obras/${obra.id}/titularidades`, {
      titularId: t.id,
      categoria: t.tipo === 'PJ' ? 'EDITOR' : 'AUTOR',
      percentual: Math.round(pct * 10000) / 10000,
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
    // Obra criada mas fonograma falhou — ainda salva a obra
    obra._liberada = false;
    pool.obras.push(obra);
    return;
  }
  const fono = JSON.parse(fonoRes.body);
  metrics.fonogramasCriados.add(1);
  pace();

  // 6. Participações (3-4)
  const numParticipacoes = randomIntBetween(3, 4);
  const categorias = ['INTERPRETE', 'PRODUTOR_FONOGRAFICO', 'MUSICO_EXECUTANTE'];
  for (let i = 0; i < numParticipacoes; i++) {
    const categoria = i < categorias.length ? categorias[i] : 'MUSICO_EXECUTANTE';
    const participante = randomItem(pool.titulares);
    api.post(`/fonogramas/${fono.id}/participacoes`, {
      titularId: participante.id,
      categoria,
    });
    pace();
  }

  // 7. Calcular participações
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
