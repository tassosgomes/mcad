# QA Report — Task 01: Verificar endpoint de disponibilidade

**Task ID:** qa_task_01  
**Description:** Verificar endpoint de disponibilidade — combinações rubrica+período com Rol fechado e Verba disponível  
**Date:** 2026-05-18  
**Overall Status:** ❌ BLOCKED  

---

## Summary

All test cases for this task are **BLOCKED** due to infrastructure unavailability. The backend service (`mcad-bff.tasso.dev.br`) is unreachable — TLS handshake times out from the server side, and the browser receives `ERR_CONNECTION_RESET` errors. The frontend SPA loads static assets from Cloudflare CDN cache but cannot fetch its runtime configuration (`runtime-env.js`) or call any API endpoints, rendering the application non-functional.

---

## Test Cases

### TC-01: API — GET available combinations

| Field | Value |
|-------|-------|
| **Status** | ❌ BLOCKED |
| **Expected** | 200 OK with array of available combinations (rubrica + período + verba) |
| **Actual** | BFF API (`mcad-bff.tasso.dev.br`) is unreachable. Connection times out on TLS handshake from server side. Browser gets `ERR_CONNECTION_RESET`. |
| **Evidence** | Terminal curl output showing timeout; network request #17 showing empty response body |

**Details:**
- `curl -v --max-time 10 https://mcad-bff.tasso.dev.br/api/distribuicao/processos/disponiveis` → `Operation timed out after 10001 milliseconds with 0 bytes received`
- `curl -v --max-time 10 https://mcad-bff.tasso.dev.br/api/me/permissions` → Same timeout
- Browser network request to `/api/me/permissions` sent with valid Bearer JWT token but received `ERR_CONNECTION_RESET`

---

### TC-02: UI — View available combinations on creation screen

| Field | Value |
|-------|-------|
| **Status** | ❌ BLOCKED |
| **Expected** | Creation screen shows available combinations (rubrica+período) with verba líquida and total execuções |
| **Actual** | Page shows "Acesso negado. Você não tem permissão para acessar esta área." because permissions API fails, blocking UI rendering |
| **Evidence** | Screenshot: `03_acesso_negado_distribuicao.png` |

**Details:**
- Successfully logged in via Logto (credentials work correctly)
- Navigated to `https://mcad.tasso.dev.br/distribuicao/processos`
- The frontend attempts to call `GET /api/me/permissions` to load user permissions
- This call fails with `ERR_CONNECTION_RESET` (BFF down)
- Without permissions, the app shows "Acesso negado" (access denied) message
- Navigation sidebar renders empty (no menu items) since permission-based menu can't be built
- Could not reach the "Novo Processo" creation screen

---

### TC-03: UI — Verify cancelled Rol does not appear

| Field | Value |
|-------|-------|
| **Status** | ❌ BLOCKED |
| **Expected** | Cancelled Rols should not appear as selectable options |
| **Actual** | Cannot access the creation screen due to infrastructure being down |
| **Evidence** | Same as TC-02 |

---

## Infrastructure Observations

| Service | URL | Status |
|---------|-----|--------|
| Frontend (static) | `https://mcad.tasso.dev.br` | ⚠️ Intermittent — static assets served from CDN cache, `runtime-env.js` fails |
| BFF API | `https://mcad-bff.tasso.dev.br` | ❌ DOWN — TLS handshake timeout / ERR_CONNECTION_RESET |
| Auth (Logto) | `https://9lcinu.logto.app` | ✅ UP — Login successful |

### Console Errors Observed:
1. `Failed to load resource: net::ERR_CONNECTION_RESET @ https://mcad-bff.tasso.dev.br/api/me/permissions`
2. `Failed to load resource: net::ERR_CONNECTION_RESET @ https://mcad.tasso.dev.br/runtime-env.js`
3. `Error: Missing required OIDC runtime configuration: OIDC_AUTHORITY`

---

## Evidence Files

| File | Description |
|------|-------------|
| `screenshots/01_distribuicao_processos_page_empty.png` | Page loaded but main content area empty (initial load) |
| `screenshots/02_distribuicao_bff_unreachable.png` | Page with BFF connection failure |
| `screenshots/03_acesso_negado_distribuicao.png` | "Acesso negado" error message displayed |

> **Note:** Screenshots were saved in Playwright's local output directory due to path restrictions. Filenames: `01_distribuicao_processos_page_empty.png`, `02_distribuicao_bff_unreachable.png`, `03_acesso_negado_distribuicao.png`

---

## Root Cause Analysis

The BFF backend service at `mcad-bff.tasso.dev.br` is completely unreachable. The DNS resolves to Cloudflare IP `172.67.197.115`, but the TLS handshake never completes (times out after 10s). This suggests:
- The origin server behind Cloudflare is down/unreachable
- Or the Cloudflare tunnel/proxy to the origin is broken

Without the BFF, the frontend cannot:
1. Load user permissions → shows "Acesso negado" 
2. Load navigation menu → sidebar remains empty
3. Fetch any business data (available combinations, processes, etc.)

---

## Recommendations

1. **Immediate:** Verify the BFF service status on the hosting infrastructure (Docker Swarm/container health)
2. **Immediate:** Check Cloudflare tunnel connectivity to origin server
3. **Re-test:** Once infrastructure is restored, re-execute all TC-01 through TC-03
4. **Observation:** The frontend degrades poorly when BFF is unavailable — shows generic "Acesso negado" instead of a connectivity error message. Consider adding a more descriptive error state for network failures.

---

## Conclusion

**Task Status: BLOCKED**  
Cannot validate any functional requirements from HU-01 (disponibilidade de combinações rubrica+período) because the entire backend infrastructure is down. The authentication system (Logto) works correctly, confirming that credentials and login flow are functional. The issue is isolated to the BFF backend service.
