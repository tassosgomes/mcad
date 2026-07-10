import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import {
  mockRepertorioResponse,
  mockPendenteResponse,
} from '@/test/mocks/handlers';
import { CadastroRepertorioPage } from '../pages/CadastroRepertorioPage';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cadastro/repertorios/novo']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

async function fillStep1Obra(user: ReturnType<typeof userEvent.setup>) {
  const tituloInput = screen.getByLabelText('Título');
  await user.clear(tituloInput);
  await user.type(tituloInput, 'Minha Obra Teste');

  const tipoSelect = screen.getByLabelText('Tipo');
  await user.selectOptions(tipoSelect, 'MUSICAL');
}

async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
  await fillStep1Obra(user);
  await user.click(screen.getByRole('button', { name: /próximo/i }));
  await waitFor(() => {
    expect(screen.getByText('Titulares e Titularidades Autorais')).toBeInTheDocument();
  });
}

async function addTitularWithFullPercentage(user: ReturnType<typeof userEvent.setup>) {
  const docInput = screen.getByLabelText('CPF/CNPJ');
  await user.clear(docInput);
  await user.type(docInput, '12345678901');
  await user.click(screen.getByRole('button', { name: /buscar/i }));

  await waitFor(() => {
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: /usar este titular/i }));

  await waitFor(() => {
    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
  });

  const catSelect = screen.getByLabelText('Categoria');
  await user.selectOptions(catSelect, 'AUTOR');

  const percInput = screen.getByLabelText('Percentual (%)');
  await user.clear(percInput);
  await user.type(percInput, '100');
}

async function navigateToStep3(user: ReturnType<typeof userEvent.setup>) {
  await navigateToStep2(user);
  await addTitularWithFullPercentage(user);
  await user.click(screen.getByRole('button', { name: /próximo/i }));
  await waitFor(() => {
    expect(screen.getByText('Fonogramas e Participações')).toBeInTheDocument();
  });
}

async function addFonogramaWithRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /\+ adicionar fonograma/i }));

  await waitFor(() => {
    expect(screen.getByText(/#1/i)).toBeInTheDocument();
  });

  const isrcInput = screen.getByLabelText('ISRC');
  await user.clear(isrcInput);
  await user.type(isrcInput, 'BR-ABC-19-00001');

  const urlAudioInput = screen.getByLabelText('URL de Áudio');
  await user.clear(urlAudioInput);
  await user.type(urlAudioInput, 'https://audio.example.com/track.mp3');
}

async function addParticipacoes(user: ReturnType<typeof userEvent.setup>) {
  const nomeTitular = 'João Silva';

  const interpreteSelect = screen.getByLabelText('Adicionar Intérprete') as HTMLSelectElement;
  const produtorSelect = screen.getByLabelText('Adicionar Produtor Fonográfico') as HTMLSelectElement;

  const interpreteOption = Array.from(interpreteSelect.options).find((o: HTMLOptionElement) =>
    o.textContent?.includes(nomeTitular),
  );
  const produtorOption = Array.from(produtorSelect.options).find((o: HTMLOptionElement) =>
    o.textContent?.includes(nomeTitular),
  );

  if (interpreteOption) {
    await user.selectOptions(interpreteSelect, interpreteOption.value);
  }
  if (produtorOption) {
    await user.selectOptions(produtorSelect, produtorOption.value);
  }
}

async function navigateToStep4(user: ReturnType<typeof userEvent.setup>) {
  await navigateToStep3(user);
  await addFonogramaWithRequiredFields(user);
  await addParticipacoes(user);
  await user.click(screen.getByRole('button', { name: /revisar/i }));
  await waitFor(() => {
    expect(screen.getByText('Revisão do Repertório')).toBeInTheDocument();
  });
}

describe('CadastroRepertorioPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders wizard with step 1 (obra)', () => {
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Novo Repertório')).toBeInTheDocument();
    expect(screen.getByText('Dados da Obra')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toBeInTheDocument();
    expect(screen.getByLabelText('Subtítulo')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    expect(screen.getByLabelText('Gênero')).toBeInTheDocument();
  });

  it('cannot advance past step 1 without obra title', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /próximo/i }));

    await waitFor(() => {
      expect(screen.getByText('Título da obra é obrigatório')).toBeInTheDocument();
    });
    expect(screen.getByText('Dados da Obra')).toBeInTheDocument();
  });

  it('can advance from step 1 to step 2 when obra has title and type', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);
    expect(screen.getByText('Titulares e Titularidades Autorais')).toBeInTheDocument();
  });

  it('can go back from step 2 to step 1', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);
    await user.click(screen.getByRole('button', { name: /voltar/i }));

    await waitFor(() => {
      expect(screen.getByText('Dados da Obra')).toBeInTheDocument();
    });
  });

  it('cannot advance past step 2 without 100% autoral sum', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/adicione ao menos uma titularidade autoral/i),
      ).toBeInTheDocument();
    });
  });

  it('titular search finds existing titular', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);

    const docInput = screen.getByLabelText('CPF/CNPJ');
    await user.clear(docInput);
  await user.type(docInput, '12345678901');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /usar este titular/i })).toBeInTheDocument();
  });

  it('titular search shows empty result for unknown document', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);

    const docInput = screen.getByLabelText('CPF/CNPJ');
    await user.clear(docInput);
    await user.type(docInput, '00000000000');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nenhum titular encontrado/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /cadastrar novo titular/i }),
    ).toBeInTheDocument();
  });

  it('cannot advance past step 3 without at least 1 fonograma', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep3(user);
    await user.click(screen.getByRole('button', { name: /revisar/i }));

    await waitFor(() => {
      expect(screen.getByText(/adicione ao menos um fonograma/i)).toBeInTheDocument();
    });
  });

  it('advances to review step 4 with complete data', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep4(user);

    expect(screen.getByText('Minha Obra Teste')).toBeInTheDocument();
    expect(screen.getByText('BR-ABC-19-00001')).toBeInTheDocument();
  });

  it('full happy path: fill all steps, submit, see success', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep4(user);

    await user.click(
      screen.getByRole('button', { name: /confirmar cadastro do repertório/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/repertório cadastrado com sucesso/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Minha Obra Teste')).toBeInTheDocument();
    expect(screen.getByText('T-123.456.789-0')).toBeInTheDocument();
    expect(screen.getByText('LIBERADO')).toBeInTheDocument();
  });

  it('ISWC failure shows retry and pendente buttons', async () => {
    server.use(
      http.post('*/v1/repertorios', async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.includes('/pendentes')) {
          return HttpResponse.json(mockPendenteResponse, { status: 201 });
        }
        return HttpResponse.json(
          {
            status: 502,
            title: 'ISWC indisponível',
            code: 'ISWC_INDISPONIVEL',
          },
          { status: 502 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep4(user);

    await user.click(
      screen.getByRole('button', { name: /confirmar cadastro do repertório/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/iswc indisponível/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /tentar novamente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /salvar como pendente/i }),
    ).toBeInTheDocument();
  });

  it('pendente saves as pendente and shows result', async () => {
    server.use(
      http.post('*/v1/repertorios', async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.includes('/pendentes')) {
          return HttpResponse.json(mockPendenteResponse, { status: 201 });
        }
        return HttpResponse.json(
          { status: 502, title: 'ISWC indisponível', code: 'ISWC_INDISPONIVEL' },
          { status: 502 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep4(user);
    await user.click(
      screen.getByRole('button', { name: /confirmar cadastro do repertório/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/iswc indisponível/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /salvar como pendente/i }));

    await waitFor(() => {
      expect(screen.getByText(/obra salva como pendente/i)).toBeInTheDocument();
    });
    expect(screen.getByText('PENDENTE')).toBeInTheDocument();
  });

  it('retry after ISWC failure calls register again and succeeds', async () => {
    let callCount = 0;
    server.use(
      http.post('*/v1/repertorios', async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.includes('/pendentes')) {
          return HttpResponse.json(mockPendenteResponse, { status: 201 });
        }
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { status: 502, title: 'ISWC indisponível', code: 'ISWC_INDISPONIVEL' },
            { status: 502 },
          );
        }
        return HttpResponse.json(mockRepertorioResponse, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep4(user);
    await user.click(
      screen.getByRole('button', { name: /confirmar cadastro do repertório/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/iswc indisponível/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/repertório cadastrado com sucesso/i),
      ).toBeInTheDocument();
    });
    expect(callCount).toBe(2);
  });

  it('new titular form can be filled and added', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);

    const docInput = screen.getByLabelText('CPF/CNPJ');
    await user.clear(docInput);
    await user.type(docInput, '00000000000');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /cadastrar novo titular/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cadastrar novo titular/i }));

    await waitFor(() => {
      expect(screen.getByText('Novo Titular')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Pedro Alves');
    await user.clear(screen.getByLabelText('Documento'));
    await user.type(screen.getByLabelText('Documento'), '45678901234');
    await user.clear(screen.getByLabelText('Associação (ID)'));
    await user.type(screen.getByLabelText('Associação (ID)'), 'assoc-001');

    await user.click(screen.getByRole('button', { name: /adicionar titular/i }));

    await waitFor(() => {
      expect(screen.getByText('Pedro Alves')).toBeInTheDocument();
    });
  });

  it('can remove a titular from the list', async () => {
    const user = userEvent.setup();
    render(<CadastroRepertorioPage />, { wrapper: createWrapper() });

    await navigateToStep2(user);
    await addTitularWithFullPercentage(user);

    const removeButtons = screen.getAllByRole('button', { name: /remover/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/nenhum titular adicionado/i)).toBeInTheDocument();
    });
  });
});
