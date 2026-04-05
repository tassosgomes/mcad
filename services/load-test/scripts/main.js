/**
 * main.js — Simulador de Carga (Robô de Cadastro)
 *
 * Orquestrador principal: define options k6, carrega associações no setup(),
 * realiza seleção ponderada de cenários e adiciona think time entre ciclos.
 *
 * Cenários:
 *   A — Ciclo Completo     60%
 *   B — Obra sem Fonograma 15%
 *   C — Edição             10%
 *   D — Depuração          10%
 *   E — Bloqueio/Desbloquo  5%
 */
import { sleep } from 'k6';
import { cicloCompleto } from './scenarios/cicloCompleto.js';
import { obraSemFonograma } from './scenarios/obraSemFonograma.js';
import { edicao } from './scenarios/edicao.js';
import { depuracao } from './scenarios/depuracao.js';
import { bloqueio } from './scenarios/bloqueio.js';
import { api } from './helpers/api.js';
import { pool } from './helpers/pool.js';

// ---------------------------------------------------------------------------
// Opções k6
// ---------------------------------------------------------------------------

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 20,
  duration: __ENV.DURATION || '16d',
  thresholds: {
    http_req_failed: ['rate<0.05'],       // < 5% de erros
    http_req_duration: ['p(95)<2000'],    // p95 abaixo de 2s
  },
};

// ---------------------------------------------------------------------------
// Cenários ponderados
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { weight: 60, fn: cicloCompleto,    name: 'cicloCompleto'    },
  { weight: 15, fn: obraSemFonograma, name: 'obraSemFonograma' },
  { weight: 10, fn: edicao,           name: 'edicao'           },
  { weight: 10, fn: depuracao,        name: 'depuracao'        },
  { weight: 5,  fn: bloqueio,         name: 'bloqueio'         },
];

const TOTAL_WEIGHT = SCENARIOS.reduce((acc, s) => acc + s.weight, 0);

function selectScenario() {
  const roll = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const scenario of SCENARIOS) {
    acc += scenario.weight;
    if (roll < acc) return scenario;
  }
  return SCENARIOS[SCENARIOS.length - 1];
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Setup — executado uma vez antes dos VUs iniciarem
// Carrega as associações existentes do servidor e passa via data para os VUs.
// ---------------------------------------------------------------------------

export function setup() {
  console.log('[setup] Carregando associacoes do servidor...');

  const res = api.get('/associacoes');

  let associacoes = [];

  if (res.status >= 200 && res.status < 300) {
    try {
      const body = JSON.parse(res.body);
      // A API pode retornar array direto ou { data: [...] } ou { items: [...] }
      if (Array.isArray(body)) {
        associacoes = body;
      } else if (Array.isArray(body.data)) {
        associacoes = body.data;
      } else if (Array.isArray(body.items)) {
        associacoes = body.items;
      } else {
        console.warn('[setup] Resposta inesperada de /associacoes — usando IDs fixos');
      }
    } catch (e) {
      console.warn(`[setup] Erro ao parsear /associacoes: ${e} — usando IDs fixos`);
    }
  } else {
    console.warn(`[setup] GET /associacoes retornou status=${res.status} — usando IDs fixos`);
  }

  // Fallback: 7 associações ECAD com IDs fixos
  if (associacoes.length === 0) {
    associacoes = [
      { id: 1, nome: 'ABRAMUS' },
      { id: 2, nome: 'AMAR' },
      { id: 3, nome: 'ASSIM' },
      { id: 4, nome: 'SOCINPRO' },
      { id: 5, nome: 'UBC' },
      { id: 6, nome: 'SICAM' },
      { id: 7, nome: 'SBACEM' },
    ];
  }

  console.log(`[setup] ${associacoes.length} associacoes carregadas`);

  // Retorna data — compartilhado com todos os VUs como parâmetro read-only
  return { associacoes };
}

// ---------------------------------------------------------------------------
// Controle de progresso (log a cada ~50 iterações por VU)
// ---------------------------------------------------------------------------

let _iteracaoLocal = 0;
const LOG_INTERVAL = 50;

// ---------------------------------------------------------------------------
// Default function — executada por cada VU em loop durante a duração
// ---------------------------------------------------------------------------

export default function (data) {
  // Inicializa o pool do VU com as associações carregadas no setup()
  // A função é idempotente (só executa na primeira chamada por VU)
  pool.setupPool(data);

  _iteracaoLocal++;

  // Seleciona cenário ponderado
  const scenario = selectScenario();

  // Log periódico de progresso por VU
  if (_iteracaoLocal % LOG_INTERVAL === 0) {
    console.log(
      `[VU ${__VU}] iteracao=${_iteracaoLocal} | cenario=${scenario.name} | titulares=${pool.titulares.length} | obras=${pool.obras.length} | fonogramas=${pool.fonogramas.length}`
    );
  }

  // Executa cenário
  scenario.fn();

  // Think time entre cenários (5-10 segundos / pace_multiplier)
  const paceMultiplier = parseFloat(__ENV.PACE_MULTIPLIER || '1');
  sleep(randomIntBetween(5, 10) / paceMultiplier);
}
