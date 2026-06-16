import { http, HttpResponse } from 'msw';
import type { UsuarioMusicaSnapshot } from '@features/identificacao/captacoes/types/usuario-musica-snapshot';

const mockUsuariosMusica: UsuarioMusicaSnapshot[] = [
  { id: 'u1', razaoSocial: 'Rádio Globo SP Ltda', cnpj: '12345678000190', cnpjFormatado: '12.345.678/0001-90', status: 'ATIVO' },
  { id: 'u2', razaoSocial: 'TV Globo Ltda', cnpj: '09876543210123', cnpjFormatado: '09.876.543/2101-23', status: 'ATIVO' },
  { id: 'u3', razaoSocial: 'Netflix Brasil', cnpj: '11222333000144', cnpjFormatado: '11.222.333/0001-44', status: 'ATIVO' },
];

const mockRubricas = [
  { id: 'rub-1', sigla: 'RADIO', nome: 'Rádio', exigeClassificacao: false },
  { id: 'rub-2', sigla: 'TV_ABERTA', nome: 'TV Aberta', exigeClassificacao: true },
];

const mockAnalistas = [
  { id: 'analista-1', nome: 'João' },
  { id: 'analista-2', nome: 'Maria' },
];

export const handlers = [
  http.get('*/api/identificacao/v1/usuarios-musica', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';

    if (q.length < 2) {
      return HttpResponse.json({ items: [] });
    }

    const filtered = mockUsuariosMusica.filter((u) =>
      u.razaoSocial.toLowerCase().includes(q.toLowerCase()),
    );

    return HttpResponse.json({ items: filtered });
  }),

  http.get('*/api/identificacao/v1/rubricas', () => {
    return HttpResponse.json(mockRubricas);
  }),

  http.get('*/api/identificacao/v1/analistas', () => {
    return HttpResponse.json(mockAnalistas);
  }),
];
