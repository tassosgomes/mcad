# Resumo de Tarefas — Autenticação e Autorização

## Visão Geral

Implementação retroativa de autenticação (Keycloak JWT) e autorização (policies read/write) no backend e frontend. São 11 tarefas em 3 lanes (Keycloak config + Backend + Frontend).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | JWT Bearer, Policies, ClaimsTransformation |
| `react-architecture` | AuthProvider, ProtectedRoute, useAuth hook |
| `dotnet-testing` | Testes com mock JWT |

## Tarefas

### Lane 0 — Keycloak (Pré-requisito)
- [x] 0.0 Keycloak: Configurar Realm, Client (PKCE), Roles e Usuários de Teste

### Lane A — Backend (.NET 8)
- [x] 1.0 Backend: JWT Authentication + ClaimsTransformation + Policies + AUTH_ENABLED
- [x] 2.0 Backend: Proteger TODOS os endpoints existentes com RequireAuthorization
- [x] 3.0 Backend: Testes (unitários ClaimsTransformation + integração auth)

### Lane B — Frontend (React)
- [x] 4.0 Frontend: Instalar oidc-client-ts + criar shared/auth (Provider, Context, Hook, Config)
- [x] 5.0 Frontend: CallbackPage + ProtectedRoute + Router update
- [x] 6.0 Frontend: apiClient + Authorization header
- [x] 7.0 Frontend: Header (nome + role badge + logout)
- [x] 8.0 Frontend: Ocultar botões de ação para Consultor (todas as páginas)
- [x] 9.0 Frontend: App.tsx + .env.example

### Validação
- [x] 10.0 Validação End-to-End: fluxo completo login → CRUD → logout

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 a RF-06 (JWT + JWKS + 401/403) | 1.0 | ✅ |
| RF-07 a RF-11 (policies read/write) | 1.0, 2.0 | ✅ |
| RF-12/13 (AUTH_ENABLED flag) | 1.0 | ✅ |
| RF-14 a RF-20 (OIDC frontend) | 4.0, 5.0, 9.0 | ✅ |
| RF-21 (useAuth hook) | 4.0 | ✅ |
| RF-22 (ProtectedRoute) | 5.0 | ✅ |
| RF-23/24 (ocultar botões Consultor) | 8.0 | ✅ |
| RF-25 (Authorization header) | 6.0 | ✅ |
| RF-26 a RF-28 (agnóstico) | 4.0, 9.0 | ✅ |

## Análise de Paralelização

```
              [0.0 Keycloak Config]
                 ↓            ↓
Lane A (Backend)              Lane B (Frontend)

[1.0 JWT+Policies]           [4.0 oidc-client-ts + shared/auth]
    ↓                              ↓
[2.0 Proteger endpoints]     [5.0 Callback + ProtectedRoute]
    ↓                              ↓
[3.0 Testes]                 [6.0 apiClient + header]
                                   ↓
                              [7.0 Header (nome+logout)]
                                   ↓
                              [8.0 Ocultar botões Consultor]
                                   ↓
                              [9.0 App.tsx + .env]
                                   ↓
                  ←──── [10.0 Validação E2E] ────→
```
