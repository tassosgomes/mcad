/**
 * Cenário C — Edição (10%)
 *
 * Seleciona entidade existente aleatória e edita campos:
 * - Titular: nome
 * - Obra: título
 * - Fonograma: país de origem
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { gen, randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
}

const PAISES = ['Brasil', 'Estados Unidos', 'Argentina', 'Portugal', 'Franca', 'Inglaterra', 'Espanha'];

export function edicao() {
  // Escolhe aleatoriamente qual tipo de entidade editar
  const opcoes = [];
  if (pool.titulares.length > 0) opcoes.push('titular');
  if (pool.obras.length > 0) opcoes.push('obra');
  if (pool.fonogramas.length > 0) opcoes.push('fonograma');

  if (opcoes.length === 0) {
    console.log('[edicao] Pool vazio, nada para editar ainda');
    return;
  }

  const tipo = randomItem(opcoes);
  pace();

  if (tipo === 'titular') {
    const titular = randomItem(pool.titulares);
    api.put(`/titulares/${titular.id}`, {
      nome: gen.nomeEditado(),
    });
  } else if (tipo === 'obra') {
    const obra = randomItem(pool.obras);
    api.put(`/obras/${obra.id}`, {
      titulo: gen.tituloEditado(),
    });
  } else {
    const fono = randomItem(pool.fonogramas);
    api.put(`/fonogramas/${fono.id}`, {
      paisOrigem: randomItem(PAISES),
    });
  }
}
