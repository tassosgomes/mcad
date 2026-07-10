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

export const mockTitularesRepertorio = [
  {
    id: 'tit-001',
    nome: 'João Silva',
    tipo: 'PF',
    documento: '12345678901',
    documentoFormatado: '123.***.789-01',
    associacao: 'ABRAMUS',
  },
  {
    id: 'tit-002',
    nome: 'Maria Souza',
    tipo: 'PF',
    documento: '98765432198',
    documentoFormatado: '987.***.654-32',
    associacao: 'UBC',
  },
  {
    id: 'tit-003',
    nome: 'Editora Musical Ltda',
    tipo: 'PJ',
    documento: '12345678000190',
    documentoFormatado: '12.345.***/0001-90',
    associacao: 'SICAM',
  },
];

export const mockRepertorioResponse = {
  obraId: 'obra-abc-123',
  obraTitulo: 'Minha Obra Teste',
  statusObra: 'LIBERADO',
  iswc: 'T-123.456.789-0',
  fonogramas: [
    {
      id: 'fon-001',
      isrc: 'BR-ABC-19-00001',
      status: 'LIBERADO',
      link: '/cadastro/fonogramas/fon-001',
    },
  ],
  titularesCriados: [],
  iswcObtido: true,
  obraLink: '/cadastro/obras/obra-abc-123',
  fonogramaLinks: ['/cadastro/fonogramas/fon-001'],
};

export const mockPendenteResponse = {
  obraId: 'obra-pend-456',
  obraTitulo: 'Minha Obra Pendente',
  statusObra: 'PENDENTE',
  iswc: null,
  fonogramas: [
    {
      id: 'fon-002',
      isrc: 'BR-DEF-19-00002',
      status: 'PENDENTE_DOCUMENTACAO',
      link: '/cadastro/fonogramas/fon-002',
    },
  ],
  titularesCriados: [],
  iswcObtido: false,
  obraLink: '/cadastro/obras/obra-pend-456',
  fonogramaLinks: ['/cadastro/fonogramas/fon-002'],
};

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

  http.get('*/v1/repertorios/titulares', ({ request }) => {
    const url = new URL(request.url);
    const documento = url.searchParams.get('documento') ?? '';

    if (!documento) {
      return HttpResponse.json(null);
    }

    if (documento === '00000000000') {
      return HttpResponse.json(null);
    }

    const found = mockTitularesRepertorio.find((t) =>
      t.documento.includes(documento.replace(/\D/g, '')),
    );

    if (!found) {
      return HttpResponse.json(null);
    }

    return HttpResponse.json(found);
  }),

  http.post('*/v1/repertorios', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const obra = (body.obra as Record<string, string>) ?? {};
    const titulo = obra.titulo ?? '';

    if (titulo === 'FORCE_ISWC_FAILURE') {
      return HttpResponse.json(
        {
          status: 502,
          title: 'ISWC indisponível',
          detail: 'Não foi possível obter o ISWC no momento.',
          code: 'ISWC_INDISPONIVEL',
        },
        { status: 502 },
      );
    }

    return HttpResponse.json(mockRepertorioResponse, { status: 201 });
  }),

  http.post('*/v1/repertorios/pendentes', () => {
    return HttpResponse.json(mockPendenteResponse, { status: 201 });
  }),
];
