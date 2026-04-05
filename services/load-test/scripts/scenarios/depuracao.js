/**
 * Cenário D — Depuração (10%)
 *
 * Se pool tem obra ou fonograma LIBERADO:
 *   1. Tenta editar via PUT — espera status 409 (Conflict) para entidade liberada
 *   2. Se 409 recebido: confirma depuração via POST /depurar com dados novos
 *   3. Adiciona nova entidade ao pool (não liberada)
 *
 * Se nenhum LIBERADO disponível: fallback para cicloCompleto.
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

export function depuracao() {
  // Verifica se há entidades LIBERADAS disponíveis para depurar
  const obraLiberada = pool.getObraLiberadaAleatoria();
  const fonoLiberado = pool.getFonogramaLiberadoAleatorio();

  if (!obraLiberada && !fonoLiberado) {
    console.log('[depuracao] Nenhuma entidade liberada disponivel — fallback para cicloCompleto');
    cicloCompleto();
    return;
  }

  // Escolhe aleatoriamente entre obra ou fonograma liberado (considerando disponibilidade)
  const opcoes = [];
  if (obraLiberada) opcoes.push('obra');
  if (fonoLiberado) opcoes.push('fonograma');
  const tipo = randomItem(opcoes);

  if (tipo === 'obra') {
    const obra = obraLiberada;

    // Tenta editar obra LIBERADA — deve retornar 409 Conflict
    const novoTitulo = gen.tituloEditado();
    const res = api.put(`/obras/${obra.id}`, {
      titulo: novoTitulo,
      tipo: obra.tipo,
      genero: obra.genero,
    });

    if (res.status === 409) {
      // Depuração necessária: confirma via POST /depurar com novos dados
      pace();
      const depRes = api.post(`/obras/${obra.id}/depurar`, {
        titulo: gen.tituloEditado(),
        tipo: obra.tipo,
        genero: obra.genero,
      });

      if (depRes.status >= 200 && depRes.status < 300) {
        try {
          const body = JSON.parse(depRes.body);
          // A resposta pode conter { novaObra: {...} } ou diretamente a obra
          const novaObra = body.novaObra || body;
          novaObra._liberada = false;
          pool.obras.push(novaObra);
          metrics.depuracoes.add(1);
          metrics.obrasCriadas.add(1);
        } catch (e) {
          console.warn(`[depuracao] Erro ao parsear resposta de /obras/${obra.id}/depurar: ${e}`);
        }
      }
    } else if (res.status >= 200 && res.status < 300) {
      // Edição sucedeu sem conflito (obra pode ter saído do estado LIBERADO)
      console.log(`[depuracao] PUT /obras/${obra.id} retornou ${res.status} (sem conflito 409)`);
    }

  } else {
    // fonograma LIBERADO
    const fono = fonoLiberado;

    // Tenta editar fonograma LIBERADO — deve retornar 409 Conflict
    // PUT requer Isrc (obr.) e PaisOrigem (obr.) — sem esses campos a API retorna 400 antes do 409
    const novoIsrc = gen.fonograma(fono.obraId || fono.obra_id).isrc;
    const res = api.put(`/fonogramas/${fono.id}`, {
      isrc: novoIsrc,
      paisOrigem: fono.paisOrigem || 'Brasil',
    });

    if (res.status === 409) {
      // Depuração necessária: confirma via POST /depurar com novo ISRC
      pace();
      // DepurarFonogramaRequest requer Isrc (obr.) e PaisOrigem (obr.)
      const depRes = api.post(`/fonogramas/${fono.id}/depurar`, {
        isrc: gen.fonograma(fono.obraId || fono.obra_id).isrc,
        paisOrigem: fono.paisOrigem || 'Brasil',
      });

      if (depRes.status >= 200 && depRes.status < 300) {
        try {
          const body = JSON.parse(depRes.body);
          // A resposta pode conter { novoFonograma: {...} } ou diretamente o fonograma
          const novoFono = body.novoFonograma || body;
          novoFono._liberado = false;
          pool.fonogramas.push(novoFono);
          metrics.depuracoes.add(1);
          metrics.fonogramasCriados.add(1);
        } catch (e) {
          console.warn(`[depuracao] Erro ao parsear resposta de /fonogramas/${fono.id}/depurar: ${e}`);
        }
      }
    } else if (res.status >= 200 && res.status < 300) {
      console.log(`[depuracao] PUT /fonogramas/${fono.id} retornou ${res.status} (sem conflito 409)`);
    }
  }
}
