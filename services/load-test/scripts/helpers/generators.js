/**
 * generators.js — Geradores de dados brasileiros válidos
 *
 * Exporta funções individuais e o objeto `gen` com builders de entidades.
 *
 * Funções individuais exportadas:
 *   gerarCpf()       — CPF válido (módulo 11), formatado com pontos e hífen
 *   gerarCnpj()      — CNPJ válido (módulo 11), somente dígitos
 *   gerarIsrc()      — ISRC formato BR + 3 alfanum + 2 dígitos ano + 5 dígitos seq
 *   gerarNome()      — Nome + sobrenome aleatório
 *   gerarNomePJ()    — "Editora {sobrenome} Music Ltda"
 *   gerarTitulo()    — "{adjetivo} {substantivo}"
 *   gerarGenero()    — Gênero musical aleatório da lista
 *   gerarTipoObra()  — Ponderado: 70% LITEROMUSICAL, 20% MUSICAL, 5% VERSAO, 5% POT_POURRI
 */

import { pool } from './pool.js';

// k6 carrega JSON com open() — import de JSON não é suportado nativamente
const nomes = JSON.parse(open('../data/nomes.json'));
const titulos = JSON.parse(open('../data/titulos.json'));
const generos = JSON.parse(open('../data/generos.json'));

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items) {
  // items: [{ valor, weight }, ...]
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.valor;
  }
  return items[items.length - 1].valor;
}

function randomDate(yearMin, yearMax) {
  const year = randomIntBetween(yearMin, yearMax);
  const month = String(randomIntBetween(1, 12)).padStart(2, '0');
  const day = String(randomIntBetween(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// 2.2 — CPF: 9 dígitos aleatórios + 2 dígitos verificadores (módulo 11)
// ---------------------------------------------------------------------------

export function gerarCpf() {
  const digits = Array.from({ length: 9 }, () => randomIntBetween(0, 9));

  function calcDigit(arr, factor) {
    const sum = arr.reduce((acc, d, i) => acc + d * (factor - i), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const d1 = calcDigit(digits, 10);
  const d2 = calcDigit([...digits, d1], 11);

  const cpf = [...digits, d1, d2].join('');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ---------------------------------------------------------------------------
// 2.2 — CNPJ: 8 dígitos aleatórios + filial 0001 fixo + 2 DVs (módulo 11 numérico)
// ---------------------------------------------------------------------------

export function gerarCnpj() {
  // Primeiros 8 dígitos aleatórios + filial matriz (0001) fixo = 12 dígitos base
  const base = Array.from({ length: 8 }, () => randomIntBetween(0, 9));
  const digits = [...base, 0, 0, 0, 1]; // 12 dígitos

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcDigit(arr, weights) {
    const sum = arr.reduce((acc, d, i) => acc + d * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const d1 = calcDigit(digits, weights1);
  const d2 = calcDigit([...digits, d1], weights2);

  return [...digits, d1, d2].join(''); // 14 dígitos numéricos, sem formatação
}

// ---------------------------------------------------------------------------
// 2.2 — ISRC: "BR" + 3 chars alfanum + 2 dígitos ano + 5 dígitos sequencial
// Formato: BRABC2312345 (12 chars total)
// ---------------------------------------------------------------------------

export function gerarIsrc() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const reg = Array.from({ length: 3 }, () => chars[randomIntBetween(0, chars.length - 1)]).join('');
  const ano = String(randomIntBetween(20, 26)).padStart(2, '0');
  const seq = String(randomIntBetween(10000, 99999));
  return `BR${reg}${ano}${seq}`; // 2 + 3 + 2 + 5 = 12 chars
}

// ---------------------------------------------------------------------------
// 2.2 — Geradores de nomes e títulos
// ---------------------------------------------------------------------------

export function gerarNome() {
  return `${randomItem(nomes.nomes)} ${randomItem(nomes.sobrenomes)}`;
}

export function gerarNomePJ() {
  return `Editora ${randomItem(nomes.sobrenomes)} Music Ltda`;
}

export function gerarTitulo() {
  return `${randomItem(titulos.adjetivos)} ${randomItem(titulos.substantivos)}`;
}

// ---------------------------------------------------------------------------
// 2.2 — Gênero e tipo de obra
// ---------------------------------------------------------------------------

export function gerarGenero() {
  return randomItem(generos);
}

const TIPOS_OBRA = [
  { valor: 'LITEROMUSICAL', weight: 70 },
  { valor: 'MUSICAL',       weight: 20 },
  { valor: 'VERSAO',        weight: 5  },
  { valor: 'POT_POURRI',    weight: 5  },
];

export function gerarTipoObra() {
  return weightedRandom(TIPOS_OBRA);
}

// ---------------------------------------------------------------------------
// 2.2 — Builders de entidades completas
// ---------------------------------------------------------------------------

export const gen = {
  /**
   * Objeto completo de titular (PF 80% / PJ 20%)
   * Requer pool.associacoes populado via setupPool()
   */
  titular() {
    const isPJ = Math.random() < 0.2;
    const associacao = randomItem(pool.associacoes);

    return {
      nome: isPJ ? gerarNomePJ() : gerarNome(),
      tipo: isPJ ? 'PJ' : 'PF',
      documento: isPJ ? gerarCnpj() : gerarCpf(),
      nacionalidade: 'Brasileira',
      associacaoId: associacao.id,
    };
  },

  /**
   * Objeto completo de obra (titulo, tipo, genero)
   */
  obra() {
    return {
      titulo: gerarTitulo(),
      tipo: gerarTipoObra(),
      genero: gerarGenero(),
    };
  },

  /**
   * Objeto completo de fonograma (isrc, obraId, paisOrigem, datas)
   */
  fonograma(obraId) {
    return {
      isrc: gerarIsrc(),
      obraId,
      paisOrigem: 'Brasil',
      dataGravacao: randomDate(2010, 2025),
      dataLancamento: randomDate(2010, 2025),
    };
  },

  // Auxiliares usados nos cenários de edição e bloqueio

  tituloEditado() {
    return `${gerarTitulo()} (edit)`;
  },

  nomeEditado() {
    return `${gerarNome()} Jr.`;
  },

  justificativaBloqueio() {
    const motivos = [
      'Investigacao de direitos autorais',
      'Disputa de titularidade',
      'Revisao administrativa pendente',
      'Solicitacao de titular',
      'Auditoria interna',
    ];
    return randomItem(motivos);
  },
};

export { randomItem, randomIntBetween };
