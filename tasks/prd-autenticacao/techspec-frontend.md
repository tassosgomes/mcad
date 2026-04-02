# Tech Spec Frontend — Autenticação e Autorização

> **PRD:** `tasks/prd-autenticacao/prd.md`
> **Referência:** `docs/architecture/auth-plan.md`
> **Data:** 2026-04-01

---

## Resumo Executivo

Implementação da autenticação OIDC no frontend React com `oidc-client-ts` (agnóstico ao Keycloak). Cria: `shared/auth/` com AuthProvider, AuthContext, useAuth hook, ProtectedRoute, CallbackPage e authConfig. Modifica: apiClient (Authorization header), App.tsx (AuthProvider), Header (nome + logout), e todas as páginas/componentes que exibem botões de ação (ocultados para Consultor).

## Design de Implementação

### Estrutura de Pastas

```
frontend/src/shared/auth/
├── authConfig.ts           ← Configuração OIDC do .env
├── AuthContext.tsx          ← React Context (user, roles, isAuthenticated)
├── AuthProvider.tsx         ← Provider que wrapa UserManager
├── useAuth.ts              ← Hook: login, logout, token, hasRole(), user
├── ProtectedRoute.tsx      ← Route guard (redirect se não autenticado)
├── CallbackPage.tsx        ← Processa redirect do Keycloak
└── index.ts                ← Exports
```

### authConfig.ts

```typescript
import { UserManagerSettings } from 'oidc-client-ts';

export const oidcConfig: UserManagerSettings = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,
  post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile',
  automaticSilentRenew: true,
  // In-memory storage (não localStorage)
};
```

### AuthProvider.tsx

```typescript
import { UserManager, User } from 'oidc-client-ts';
import { oidcConfig } from './authConfig';

const userManager = new UserManager(oidcConfig);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    userManager.getUser().then(u => {
      setUser(u);
      setIsLoading(false);
    });

    userManager.events.addUserLoaded(setUser);
    userManager.events.addUserUnloaded(() => setUser(null));

    return () => {
      userManager.events.removeUserLoaded(setUser);
      userManager.events.removeUserUnloaded(() => setUser(null));
    };
  }, []);

  const login = () => userManager.signinRedirect();
  const logout = () => userManager.signoutRedirect();
  const getToken = () => user?.access_token ?? null;

  const roles: string[] = user?.profile?.realm_access?.roles ?? [];
  const hasRole = (role: string) => roles.includes(role);

  if (isLoading) return <Loading />;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, roles, hasRole, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### useAuth.ts

```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
}

// Tipo do contexto:
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  roles: string[];
  hasRole: (role: string) => boolean;
  login: () => void;
  logout: () => void;
  getToken: () => string | null;
}
```

### ProtectedRoute.tsx

```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) login();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Loading />;
  return <>{children}</>;
}
```

### CallbackPage.tsx

```typescript
export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    new UserManager(oidcConfig).signinRedirectCallback().then(() => {
      const returnUrl = sessionStorage.getItem('returnUrl') || '/';
      navigate(returnUrl, { replace: true });
    });
  }, []);

  return <Loading />;
}
```

### apiClient.ts — Authorization Header

```typescript
// shared/services/apiClient.ts — MODIFICAR

// Importar getToken do auth
let getTokenFn: (() => string | null) | null = null;

export function setAuthTokenProvider(fn: () => string | null) {
  getTokenFn = fn;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getTokenFn?.();
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return fetch(url, options);
}

// Substituir fetch por fetchWithAuth em apiGet, apiPost, apiPut, apiDelete, apiDeleteWithBody
```

### Header.tsx — Nome + Logout

```typescript
// shared/components/layout/header/Header.tsx — MODIFICAR

import { useAuth } from '@shared/auth';

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* ... brand existente ... */}
      </div>
      <div className={styles.right}>
        {user && (
          <>
            <span className={styles.userName}>{user.profile.name}</span>
            <Badge variant="secondary">{user.profile.realm_access?.roles?.includes('analista-cadastro') ? 'Analista' : 'Consultor'}</Badge>
            <button className={styles.logoutButton} onClick={logout} type="button">
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
```

### Ocultar Botões de Ação para Consultor

Padrão em todas as páginas:

```typescript
const { hasRole } = useAuth();
const canWrite = hasRole('analista-cadastro');

// No PageHeader.action:
action={canWrite ? <Button ...>Novo Titular</Button> : undefined}

// Nos botões inline da tabela:
{canWrite && <Button onClick={onEdit}>Editar</Button>}

// Nos botões de status:
{canWrite && obra.status === 'PENDENTE' && <LiberarButton ... />}
```

### Router — Adicionar CallbackPage

```typescript
// app/router/routes.tsx — MODIFICAR
import { CallbackPage } from '@shared/auth';
import { ProtectedRoute } from '@shared/auth';

export const router = createBrowserRouter([
  { path: '/callback', element: <CallbackPage /> },
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      // ... rotas existentes ...
    ],
  },
]);
```

### App.tsx — AuthProvider

```typescript
// src/App.tsx — MODIFICAR
import { AuthProvider } from '@shared/auth';

export function App() {
  return (
    <AuthProvider>
      <QueryClientProvider ...>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/shared/auth/authConfig.ts` | Config | OIDC settings do .env |
| `frontend/src/shared/auth/AuthContext.tsx` | Context | User, roles, hasRole, login, logout |
| `frontend/src/shared/auth/AuthProvider.tsx` | Provider | Wrapa UserManager do oidc-client-ts |
| `frontend/src/shared/auth/useAuth.ts` | Hook | Acesso ao auth context |
| `frontend/src/shared/auth/ProtectedRoute.tsx` | Component | Redirect se não autenticado |
| `frontend/src/shared/auth/CallbackPage.tsx` | Page | Processa redirect do Keycloak |
| `frontend/src/shared/auth/index.ts` | Export | Public API |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/.env.example` | +VITE_OIDC_AUTHORITY, +VITE_OIDC_CLIENT_ID, +VITE_OIDC_REDIRECT_URI, +VITE_OIDC_POST_LOGOUT_REDIRECT_URI |
| `frontend/src/shared/services/apiClient.ts` | +setAuthTokenProvider, +fetchWithAuth (Authorization header em todos os requests) |
| `frontend/src/shared/components/layout/header/Header.tsx` | +nome do usuário, +badge role, +botão logout |
| `frontend/src/app/router/routes.tsx` | +CallbackPage route, +ProtectedRoute wrapper |
| `frontend/src/App.tsx` | +AuthProvider wrapper (acima de QueryClientProvider) |
| `frontend/src/features/cadastro/titulares/pages/TitularesPage.tsx` | +canWrite para ocultar botão "Novo Titular" |
| `frontend/src/features/cadastro/titulares/components/TitularesTable.tsx` | +canWrite para ocultar ações editar/excluir |
| `frontend/src/features/cadastro/obras/pages/ObraDetailPage.tsx` | +canWrite para ocultar botões ação |
| `frontend/src/features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` | +canWrite para ocultar botões |
| `frontend/src/features/cadastro/fonogramas/pages/FonogramasPage.tsx` | +canWrite para ocultar "Novo Fonograma" |
| `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` | +canWrite para ocultar "Nova Obra" |
| `frontend/src/features/cadastro/titularidades/components/TitularidadesSection.tsx` | +canWrite para ocultar "Adicionar Titular" |
| `frontend/src/features/cadastro/participacoes/components/ParticipacoesSection.tsx` | +canWrite para ocultar "Adicionar Participante" + "Calcular" |

### Pacotes NPM

| Pacote | Propósito |
|--------|-----------|
| `oidc-client-ts` | Autenticação OIDC (PKCE, silent refresh) |

---

*Tech Spec Frontend gerada.*
