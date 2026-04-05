/**
 * Cenário C — Edição (10%)
 *
 * Se pool tem entidades: seleciona aleatório (titular, obra PENDENTE ou fonograma PENDENTE)
 * e edita um campo (nome, título/gênero, país).
 * Se pool vazio: fallback para cicloCompleto.
 */
import { sleep } from 'k6';
import { api } from '../helpers/api.js';
import { gen, randomItem, randomIntBetween } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { cicloCompleto } from './cicloCompleto.js';

const PACE_MULTIPLIER = parseFloat(__ENV.PACE_MULTIPLIER || '1');

function pace() {
  const baseDelay = randomIntBetween(2, 3);
  sleep(baseDelay / PACE_MULTIPLIER);
}

const PAISES = [
  'Brasil', 'Estados Unidos', 'Argentina', 'Portugal',
  'Franca', 'Inglaterra', 'Espanha', 'Italia', 'Mexico',
];

export function edicao() {
  // Monta lista de opções com entidades disponíveis no pool
  const opcoes = [];
  if (pool.titulares.length > 0) opcoes.push('titular');

  // Prioriza entidades PENDENTE (não liberadas) para edição — liberadas vão para depuração
  const obrasPendentes = pool.obras.filter((o) => !o._liberada);
  if (obrasPendentes.length > 0) opcoes.push('obra');

  const fonosPendentes = pool.fonogramas.filter((f) => !f._liberado);
  if (fonosPendentes.length > 0) opcoes.push('fonograma');

  // Fallback: se nenhuma entidade disponível, executa cicloCompleto
  if (opcoes.length === 0) {
    console.log('[edicao] Pool vazio — fallback para cicloCompleto');
    cicloCompleto();
    return;
  }

  const tipo = randomItem(opcoes);
  pace();

  if (tipo === 'titular') {
    const titular = randomItem(pool.titulares);
    // PUT requer todos os campos obrigatórios: Nome, Nacionalidade, AssociacaoId, Status
    api.put(`/titulares/${titular.id}`, {
      nome: gen.nomeEditado(),
      nacionalidade: titular.nacionalidade || 'Brasileira',
      associacaoId: titular.associacaoId,
      status: titular.status || 'ATIVO',
      caeIpi: titular.caeIpi || null,
    });

  } else if (tipo === 'obra') {
    const obra = randomItem(obrasPendentes);
    // PUT requer Titulo (obr.) e Tipo (obr.); Subtitulo e Genero são opcionais
    const novoGenero = Math.random() < 0.4 ? gen.obra().genero : obra.genero;
    api.put(`/obras/${obra.id}`, {
      titulo: gen.tituloEditado(),
      tipo: obra.tipo,
      genero: novoGenero,
    });

  } else {
    // fonograma PENDENTE — edita país de origem
    // PUT requer Isrc (obr.) e PaisOrigem (obr.)
    const fono = randomItem(fonosPendentes);
    api.put(`/fonogramas/${fono.id}`, {
      isrc: fono.isrc,
      paisOrigem: randomItem(PAISES),
    });
  }
}
