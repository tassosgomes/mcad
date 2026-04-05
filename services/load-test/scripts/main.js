/**
 * main.js — Simulador de Carga (Robô de Cadastro)
 *
 * Orquestrador principal: define options, realiza seleção ponderada de cenários
 * e adiciona think time entre ciclos.
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
import { metrics } from './helpers/metrics.js';

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
  { weight: 60, fn: cicloCompleto,     name: 'cicloCompleto' },
  { weight: 15, fn: obraSemFonograma, name: 'obraSemFonograma' },
  { weight: 10, fn: edicao,           name: 'edicao' },
  { weight: 10, fn: depuracao,        name: 'depuracao' },
  { weight: 5,  fn: bloqueio,         name: 'bloqueio' },
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
// Controle de progresso (log a cada 1000 entidades criadas)
// ---------------------------------------------------------------------------

// k6 não suporta estado global mutável entre VUs; o log de progresso
// é feito com base nos contadores por iteração (cada VU verifica localmente)
let _iteracaoLocal = 0;
const LOG_INTERVAL = 50; // a cada 50 iterações por VU (aproximação do log global)

// ---------------------------------------------------------------------------
// Default function — executada por cada VU em loop durante a duração
// ---------------------------------------------------------------------------

export default function () {
  _iteracaoLocal++;

  // Seleciona cenário ponderado
  const scenario = selectScenario();

  // Log periódico de progresso por VU
  // Nota: Counters k6 são objetos opacos; não expõem valor durante execução.
  // O summary completo com totais é exibido automaticamente pelo k6 ao final.
  if (_iteracaoLocal % LOG_INTERVAL === 0) {
    console.log(
      `[VU ${__VU}] iteracao=${_iteracaoLocal} | cenario=${scenario.name}`
    );
  }

  // Executa cenário
  scenario.fn();

  // Think time entre cenários (5-10 segundos / pace_multiplier)
  const paceMultiplier = parseFloat(__ENV.PACE_MULTIPLIER || '1');
  sleep(randomIntBetween(5, 10) / paceMultiplier);
}
