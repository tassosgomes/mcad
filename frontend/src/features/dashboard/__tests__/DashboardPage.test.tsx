import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../pages/DashboardPage';

// Mock hooks
const useEffectiveProfileMock = vi.hoisted(() => vi.fn());
const useDashboardSummaryMock = vi.hoisted(() => vi.fn());

vi.mock('@shared/auth/meApi', () => ({
  useEffectiveProfile: useEffectiveProfileMock,
}));

vi.mock('../hooks/useDashboardSummary', () => ({
  useDashboardSummary: useDashboardSummaryMock,
}));

describe('DashboardPage', () => {
  afterEach(() => {
    useEffectiveProfileMock.mockReset();
    useDashboardSummaryMock.mockReset();
  });

  it('renders welcome message with user profile data', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'Maria Silva',
        email: 'maria@mcad.org',
        subjectId: 'user-maria',
        primaryRole: 'Analista de Cadastro',
      },
    });

    useDashboardSummaryMock.mockReturnValue({
      isLoading: false,
      data: {
        cadastro: {
          totalObras: 84200,
          totalFonogramas: 67150,
          totalTitulares: 12840,
          totalAssociacoes: 7,
          alertas: [],
        },
      },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Olá, Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Analista de Cadastro')).toBeInTheDocument();
    expect(screen.getByText('Cadastro & Catálogo')).toBeInTheDocument();
  });

  it('displays authorized domain widgets normally and hides unauthorized widgets completely', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'João Mendes',
        primaryRole: 'Analista de Arrecadação',
      },
    });

    // João has access to Arrecadação only (so other fields are undefined)
    useDashboardSummaryMock.mockReturnValue({
      isLoading: false,
      data: {
        arrecadacao: {
          arrecadacaoMes: 12450000.00,
          totalLicencasAtivas: 1842,
          totalLicencasSuspensas: 34,
          verbaLiquidaEstimada: 10580000.00,
          alertas: [],
        },
      },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Arrecadação Widget should be fully active
    expect(screen.getByText('Arrecadação')).toBeInTheDocument();
    expect(screen.getByText('Licenças Ativas')).toBeInTheDocument();

    // Other widgets (Cadastro, Identificação, Distribuição) should NOT be rendered at all
    expect(screen.queryByText('Cadastro & Catálogo')).not.toBeInTheDocument();
    expect(screen.queryByText('Identificação & Match')).not.toBeInTheDocument();
    expect(screen.queryByText('Distribuição')).not.toBeInTheDocument();

    // There should be no "Acesso Restrito" overlays
    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument();
  });

  it('displays loading state skeletons', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'Maria Silva',
      },
    });

    useDashboardSummaryMock.mockReturnValue({
      isLoading: true,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Should render skeletons
    const skeletons = screen.getAllByTestId('widget-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays empty state when no domains are authorized', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'Maria Silva',
      },
    });

    useDashboardSummaryMock.mockReturnValue({
      isLoading: false,
      data: {}, // No authorized domains returned by BFF
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Nenhum domínio disponível para o seu perfil. Solicite permissões ao administrador.'),
    ).toBeInTheDocument();
  });
});
