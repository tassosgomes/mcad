// Pool de entidades reutilizáveis por VU.
// Cada VU mantém seu próprio pool local (arrays em escopo de módulo são por VU em k6).
// O pool de associacoes é carregado no setup() e passado via __ENV ou data.
//
// IMPORTANTE: em k6, variáveis de módulo são isoladas por VU — cada VU tem seu próprio pool.

export const pool = {
  // IDs das associações disponíveis no sistema (7 associações ECAD)
  // Preenchidos com IDs fixos conhecidos; podem ser sobrescritos no setup()
  associacoes: [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
    { id: 6 },
    { id: 7 },
  ],

  // Entidades criadas ao longo da execução (crescem por ciclo)
  titulares: [],
  obras: [],
  fonogramas: [],

  getTitularesAleatorios(n) {
    if (this.titulares.length === 0) return [];
    const shuffled = [...this.titulares].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, shuffled.length));
  },

  getObraLiberadaAleatoria() {
    const liberadas = this.obras.filter((o) => o._liberada);
    if (liberadas.length === 0) return null;
    return liberadas[Math.floor(Math.random() * liberadas.length)];
  },

  getFonogramaLiberadoAleatorio() {
    const liberados = this.fonogramas.filter((f) => f._liberado);
    if (liberados.length === 0) return null;
    return liberados[Math.floor(Math.random() * liberados.length)];
  },

  getEntidadeAleatoria() {
    const all = [...this.titulares, ...this.obras, ...this.fonogramas];
    if (all.length === 0) return null;
    return all[Math.floor(Math.random() * all.length)];
  },
};
