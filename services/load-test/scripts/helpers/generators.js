import { pool } from './pool.js';

// k6 carrega JSON com open() + JSON.parse (import de JSON não é suportado nativamente)
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
// CPF — módulo 11
// ---------------------------------------------------------------------------

function gerarCpf() {
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
// CNPJ — módulo 11 (somente numérico, sem formatação de filial)
// ---------------------------------------------------------------------------

function gerarCnpj() {
  const digits = Array.from({ length: 12 }, () => randomIntBetween(0, 9));
  // Forçar CNPJ matriz (últimos 4 = 0001)
  digits[8] = 0;
  digits[9] = 0;
  digits[10] = 0;
  digits[11] = 1;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcDigit(arr, weights) {
    const sum = arr.reduce((acc, d, i) => acc + d * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const d1 = calcDigit(digits, weights1);
  const d2 = calcDigit([...digits, d1], weights2);

  return [...digits, d1, d2].join('');
}

// ---------------------------------------------------------------------------
// ISRC — formato: BR + 3 chars alfanuméricos + 2 dígitos ano + 5 dígitos seq
// ---------------------------------------------------------------------------

function gerarIsrc() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const reg = Array.from({ length: 3 }, () => chars[randomIntBetween(0, chars.length - 1)]).join('');
  const ano = String(randomIntBetween(20, 26)).padStart(2, '0');
  const seq = String(randomIntBetween(10000, 99999));
  return `BR${reg}${ano}${seq}`;
}

// ---------------------------------------------------------------------------
// Geradores de entidades
// ---------------------------------------------------------------------------

export const gen = {
  titular() {
    const isPJ = Math.random() < 0.2;
    const associacao = randomItem(pool.associacoes);

    return {
      nome: isPJ
        ? `Editora ${randomItem(nomes.sobrenomes)} Music Ltda`
        : `${randomItem(nomes.nomes)} ${randomItem(nomes.sobrenomes)}`,
      tipo: isPJ ? 'PJ' : 'PF',
      documento: isPJ ? gerarCnpj() : gerarCpf(),
      nacionalidade: 'Brasileira',
      associacaoId: associacao.id,
    };
  },

  obra() {
    const tiposObra = [
      { valor: 'LITEROMUSICAL', weight: 70 },
      { valor: 'MUSICAL', weight: 20 },
      { valor: 'VERSAO', weight: 5 },
      { valor: 'POT_POURRI', weight: 5 },
    ];

    return {
      titulo: `${randomItem(titulos.adjetivos)} ${randomItem(titulos.substantivos)}`,
      tipo: weightedRandom(tiposObra),
      genero: randomItem(generos),
    };
  },

  fonograma(obraId) {
    return {
      isrc: gerarIsrc(),
      obraId,
      paisOrigem: 'Brasil',
      dataGravacao: randomDate(2010, 2025),
      dataLancamento: randomDate(2010, 2025),
    };
  },

  tituloEditado() {
    return `${randomItem(titulos.adjetivos)} ${randomItem(titulos.substantivos)} (edit)`;
  },

  nomeEditado() {
    return `${randomItem(nomes.nomes)} ${randomItem(nomes.sobrenomes)} Jr.`;
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
