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

---

## Atualizacao de Implementacao — 2026-05-19

Esta secao descreve o frontend como esta implementado hoje no codigo. O conteudo original acima permanece como historico da especificacao planejada.

### Estrutura Efetiva

| Area | Arquivos principais |
|------|---------------------|
| OIDC/Auth | `frontend/src/shared/auth/authConfig.ts`, `AuthProvider.tsx`, `AuthContext.tsx`, `useAuth.ts` |
| Rotas de auth | `CallbackPage.tsx`, `SilentCallbackPage.tsx`, `LoggedOutPage.tsx`, `ProtectedRoute.tsx`, `authorizedRoutes.ts` |
| Autorizacao UX | `frontend/src/shared/authz/PermissionsProvider.tsx`, `usePermissions.ts`, `Can.tsx`, `permissionsApi.ts` |
| Guard de rota por permissao | `frontend/src/shared/auth/RequirePermission.tsx` |
| Fetch autenticado | `frontend/src/shared/services/authenticatedFetch.ts` e clients por dominio |
| Config runtime | `frontend/src/shared/config/runtimeConfig.ts` e `frontend/public/runtime-env.template.js` |

### Configuracao OIDC Implementada

`authConfig.ts` usa `oidc-client-ts` com:

- `authority`, `client_id`, `audience`, redirects e post-logout vindos de `window.RUNTIME_ENV`.
- `response_type: 'code'`.
- `scope: 'openid profile roles access write'`.
- `resource` enviado em `extraQueryParams` e `extraTokenParams`, necessario para o Logto emitir access token JWT com audiencia da API.
- `automaticSilentRenew: true`.
- `userStore` com `InMemoryWebStorage`, mantendo tokens fora de `localStorage`/`sessionStorage`.
- `silent_redirect_uri` resolvido para `/silent-callback`.

### AuthProvider e useAuth

O contexto implementado expoe:

```ts
{
  user,
  isAuthenticated,
  isLoggingOut,
  roles,
  login,
  logout,
  getToken
}
```

Observacoes:

- `roles` vem de `user.profile.roles` e e usado para exibicao no header e para escolher uma rota inicial apos callback.
- Nao ha `hasRole(role)` no contexto implementado.
- `AuthProvider` registra o token provider em todos os clients: Cadastro, Identificacao, Arrecadacao, Distribuicao, Auditoria e AuthZ.
- Em `401`, `authenticatedFetch` chama um handler global que tenta `signinSilent()`. Se a renovacao falhar e nao houver logout em andamento, inicia novo login redirect.
- `logout()` marca `auth.logout_in_progress` em `sessionStorage`, remove `returnUrl` e chama `signoutRedirect()`.

### Autorizacao por Permissoes

A autorizacao de interface foi implementada sobre permissoes efetivas, nao sobre checagem direta de roles:

- `PermissionsProvider` usa React Query e chama `/api/me/permissions` quando o usuario esta autenticado.
- `permissionsApi.ts` envia `Authorization: Bearer <token>` para o BFF.
- O BFF retorna `{ subjectId, permissions, version }` e pode expor `X-Authz-Version`.
- `usePermissions()` expoe `can(permission)`, `hasAny(permissions)`, `hasAll(permissions)`, `reload()`, `permissions`, `version`, `isLoading` e `error`.
- `Can` renderiza filhos condicionalmente para elementos pontuais.
- `RequirePermission` protege rotas e exibe `PermissionDeniedFallback` quando o usuario nao tem permissao.
- `401` ao buscar permissoes dispara logout e limpa o cache de permissoes.

### Rotas Protegidas

O roteador atual possui:

- `/callback`: processa `signinRedirectCallback()` e redireciona para `returnUrl` ou rota padrao por role.
- `/silent-callback`: processa `signinSilentCallback()`.
- `/logout`: limpa estado OIDC local e oferece novo login.
- `/`: protegido por `ProtectedRoute`.
- `/cadastro/*`: exige `cadastro:default:associacao:listar`.
- `/identificacao/*`: exige `identificacao:default:captacao:listar`.
- `/arrecadacao/*`: exige `arrecadacao:default:cliente:listar`.
- `/distribuicao/*`: exige uma das permissoes de leitura de rubricas ou processos.
- `/auditoria/*`, `/autorizacao/*` e `/copiloto`: exigem conjuntos especificos de permissoes via `anyOf`.

### Gating de Acoes no Cadastro

As telas de Cadastro consultam `usePermissions()` e escondem acoes com base em permissoes especificas:

| Tela/componente | Permissoes usadas |
|-----------------|-------------------|
| `TitularesPage` | `titular:criar`, `titular:editar`, `titular:excluir` |
| `TitularForm` | `titular:criar` ou `titular:editar` |
| `ObrasPage` | `obra:criar`, `obra:editar`, `obra:excluir` |
| `ObraDetailPage` | `obra:editar`, `obra:excluir`, `status:liberar-obra`, `status:bloquear-obra`, `status:desbloquear-obra` |
| `ObraForm` | `obra:criar` ou `obra:editar` |
| `FonogramasPage` | `fonograma:criar`, `fonograma:editar`, `fonograma:excluir` |
| `FonogramaDetailPage` | `fonograma:editar`, `fonograma:excluir`, status de fonograma |
| `FonogramaForm` | `fonograma:criar` ou `fonograma:editar` |
| `TitularidadesSection` | `titularidade:adicionar` |
| `ParticipacoesSection` | `participacao:adicionar` |

As strings completas seguem o formato `cadastro:default:<recurso>:<acao>`.

### BFF e Permissoes Efetivas

O frontend nao consulta o ecad-authz diretamente para `/me`; ele chama o BFF:

- `GET /api/me`: retorna identidade basica (`subjectId`, `name`, `email`).
- `GET /api/me/permissions`: retorna permissoes efetivas e versao.
- O BFF consulta `AUTHZ_BASE_URL/v1/me/authorization-context`, repassando o Bearer token.
- Em producao, `permissionsApi.ts` deriva a origem do BFF a partir de `AUTHZ_API_BASE_URL`; em desenvolvimento usa caminho relativo.

### Header e UX de Sessao

`Header.tsx` mostra nome do usuario, badge de papel e botao de logout. Os labels implementados cobrem:

- `analista-cadastro`, `consultor`
- `analista-identificacao`, `consultor-identificacao`
- `analista-arrecadacao`, `consultor-arrecadacao`
- `analista-distribuicao`

Quando nenhum papel conhecido e encontrado, exibe `Usuario autenticado`.

### Testes Implementados

| Teste | Cobertura |
|-------|-----------|
| `RequirePermission.test.tsx` | Regras `permission`, `anyOf`, `allOf`, fallback e loading. |
| `Can.test.tsx` | Renderizacao condicional por permissao. |
| `usePermissions.test.tsx` | Estado de permissoes, `can`, `hasAny`, `hasAll`. |
| `permissionsApi.test.ts` | Chamada ao BFF, parse de permissao, `X-Authz-Version` e tratamento de erro. |
| `authzRolesApi.test.ts` | Clients autenticados do modulo AuthZ via `/api/authz/v1`. |

### Divergencias do Plano Original

- A configuracao final usa `window.RUNTIME_ENV` em vez de depender apenas de `VITE_*`.
- A autorizacao da UI nao usa `hasRole`; usa permissoes efetivas vindas do BFF/ecad-authz.
- Existem paginas adicionais de sessao (`/logout`, `/silent-callback`) e utilitario de limpeza de estado OIDC.
- O token provider foi generalizado para varios clients de API, nao apenas `apiClient.ts` do Cadastro.
