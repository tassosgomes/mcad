/**
 * pool.js — Pool de entidades reutilizáveis por VU
 *
 * Em k6, variáveis de módulo são isoladas por VU — cada VU tem seu próprio pool.
 * O pool de associacoes é inicializado uma vez por VU via setupPool(data),
 * onde `data` é o objeto retornado pela função export function setup() no main.js.
 *
 * Fluxo:
 *   1. main.js::setup()     — faz GET /associacoes, retorna { associacoes: [...] }
 *   2. main.js::default(data) — chama pool.setupPool(data) no primeiro ciclo do VU
 *   3. Cenários usam pool.associacoes, pool.titulares, etc.
 */

export const pool = {
  // Associações carregadas uma vez do servidor no setup() e compartilhadas via data
  associacoes: [],

  // Entidades acumuladas ao longo da execução (crescem por ciclo, locais por VU)
  titulares: [],
  obras: [],
  fonogramas: [],

  // Controle de inicialização por VU
  _inicializado: false,

  /**
   * 2.3 — Setup function que inicializa o pool com as associações recebidas do setup() global.
   * Deve ser chamada no início da função default(data) de cada VU.
   *
   * @param {Object} data - Objeto retornado por export function setup() no main.js
   *                        Formato: { associacoes: [{ id, nome, ... }, ...] }
   */
  setupPool(data) {
    if (this._inicializado) return;

    if (data && Array.isArray(data.associacoes) && data.associacoes.length > 0) {
      this.associacoes = data.associacoes;
    } else {
      // Fallback: IDs fixos se o setup não retornou dados válidos
      // (permite rodar sem API respondendo no setup, ex: testes locais)
      console.warn('[pool] Associações não carregadas do servidor — usando IDs fixos (1-7)');
      this.associacoes = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
        { id: 5 }, { id: 6 }, { id: 7 },
      ];
    }

    this._inicializado = true;
    console.log(`[VU ${__VU}] pool inicializado com ${this.associacoes.length} associacoes`);
  },

  // ---------------------------------------------------------------------------
  // 2.3 — Seleção aleatória sem repetição
  // ---------------------------------------------------------------------------

  /**
   * Retorna até `n` titulares distintos selecionados aleatoriamente do pool.
   * Não modifica o pool original.
   *
   * @param {number} n - Quantidade de titulares desejados
   * @returns {Array} - Array com no máximo n titulares
   */
  getTitularesAleatorios(n) {
    if (this.titulares.length === 0) return [];
    const shuffled = [...this.titulares].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, shuffled.length));
  },

  /**
   * Retorna uma obra com status _liberada=true, ou null se não houver.
   */
  getObraLiberadaAleatoria() {
    const liberadas = this.obras.filter((o) => o._liberada);
    if (liberadas.length === 0) return null;
    return liberadas[Math.floor(Math.random() * liberadas.length)];
  },

  /**
   * Retorna um fonograma com status _liberado=true, ou null se não houver.
   */
  getFonogramaLiberadoAleatorio() {
    const liberados = this.fonogramas.filter((f) => f._liberado);
    if (liberados.length === 0) return null;
    return liberados[Math.floor(Math.random() * liberados.length)];
  },

  /**
   * Retorna qualquer entidade aleatória do pool (titular, obra ou fonograma).
   */
  getEntidadeAleatoria() {
    const all = [...this.titulares, ...this.obras, ...this.fonogramas];
    if (all.length === 0) return null;
    return all[Math.floor(Math.random() * all.length)];
  },
};
