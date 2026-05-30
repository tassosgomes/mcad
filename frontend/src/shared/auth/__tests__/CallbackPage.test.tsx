import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallbackPage } from '../CallbackPage';

const navigateMock = vi.hoisted(() => vi.fn());
const signinRedirectCallbackMock = vi.hoisted(() => vi.fn());
const fetchPermissionsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../authConfig', () => ({
  userManager: {
    signinRedirectCallback: signinRedirectCallbackMock,
  },
}));

vi.mock('@shared/authz/permissionsApi', () => ({
  fetchPermissions: fetchPermissionsMock,
}));

describe('CallbackPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signinRedirectCallbackMock.mockReset();
    fetchPermissionsMock.mockReset();
    sessionStorage.clear();
  });

  it('redirects from effective permissions instead of OIDC token roles', async () => {
    sessionStorage.setItem('returnUrl', '/');
    signinRedirectCallbackMock.mockResolvedValue({
      access_token: 'jwt-test',
      profile: { roles: ['analista-cadastro'] },
    });
    fetchPermissionsMock.mockResolvedValue({
      data: {
        subjectId: 'user-1',
        permissions: ['distribuicao:default:rubrica:listar'],
        version: 3,
      },
      authzVersionHeader: '3',
    });

    render(<CallbackPage />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/distribuicao/rubricas', { replace: true });
    });
    expect(fetchPermissionsMock).toHaveBeenCalledWith({ token: 'jwt-test' });
    expect(sessionStorage.getItem('returnUrl')).toBeNull();
  });
});
