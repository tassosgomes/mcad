# Relatório de Reexecução QA — F04: Registro de Pagamentos

**Data:** 2026-06-13
**Motivo:** Reexecutar testes que falharam na sessão original (2026-06-10)
**Falha original:** qa_task_07 / CT-04 — campo `cnpj` vs `cnpjFormatado`

---

## Sumário da Reexecução

| Métrica | Resultado |
|---------|-----------|
| Falha investigada | 1 (qa_task_07 / CT-04) |
| Causa raiz identificada | Sim |
| Correção aplicada | Sim |
| Testes unitários reexecutados | 93/93 ✅ |
| TypeScript reexecutado | ✅ sem erros |
| Build frontend reexecutado | ✅ BUILD SUCCESS |
| Reexecução contra produção | ❌ Bloqueada — token M2M sem provisionamento; requer deploy |
| **Resultado** | **Correção implementada e validada localmente. Aguardando deploy para validação em produção.** |

---

## FALHA 01 — qa_task_07 / CT-04: cnpj vs cnpjFormatado

### Causa Raiz

O DTO `UsuarioMusicaResumoResponse` usava o campo `cnpjFormatado` e o valor era populado com `Cnpj.getFormatado()` (formato `XX.XXX.XXX/XXXX-XX`). O contrato de API (`api-contract.md`) especifica o campo como `cnpj` com valor não formatado (14 dígitos, ex: `50997063000132`).

### Correção Aplicada

#### Backend (Java)
1. **DTO** `UsuarioMusicaResumoResponse.java`: campo `cnpjFormatado` → `cnpj`
2. **Todos os 10 handlers** que constroem `UsuarioMusicaResumoResponse`: `getCnpj().getFormatado()` → `getCnpj().getValor()`
   - `BuscarPagamentoPorIdQueryHandler.java:96`
   - `ListarPagamentosQueryHandler.java:154`
   - `RegistrarPagamentoCommandHandler.java:178`
   - `EstornarPagamentoCommandHandler.java:164`
   - `ListarLicencasQueryHandler.java:79`
   - `BuscarLicencaPorIdQueryHandler.java:46`
   - `CriarLicencaCommandHandler.java:114`
   - `SuspenderLicencaCommandHandler.java:91`
   - `EncerrarLicencaCommandHandler.java:91`
   - `ReativarLicencaCommandHandler.java:91`
3. **5 testes unitários** atualizados: stubs de `getFormatado()` → `getValor()`

#### Frontend (TypeScript)
1. **Tipo** `licencas/types/licenca.ts`: `UsuarioMusicaResumo.cnpjFormatado` → `cnpj`
2. **Componentes** de licença que exibem CNPJ agora usam `formatCnpj()` para formatar o valor bruto de 14 dígitos:
   - `LicencasTable.tsx`
   - `LicencaDetailPage.tsx`
   - `LicencaForm.tsx`

### Validação Local

| Verificação | Resultado |
|-------------|-----------|
| `mvn test -pl arrecadacao-application` | 93/93 PASS ✅ |
| `npx tsc --noEmit` (frontend) | Limpo ✅ |
| `npm run build` (frontend) | BUILD SUCCESS (2030 módulos) ✅ |

---

## Discrepâncias Não-Bloqueantes (Task 03) — Não Corrigidas

Estas discrepâncias permanecem e requerem PRs separados:

| # | Descrição | Impacto |
|---|-----------|---------|
| 1 | Formato decimal (2 vs 6 casas) no POST /uda | Baixo — visual apenas |
| 2 | Header Location ausente no POST /uda (201) | Médio — HATEOAS |
| 3 | `criadoPor` retorna nome + username | Baixo — contrato |
| 4 | Erro 400 genérico sem array `errors` | Médio — UX de validação |

---

## Arquivos Modificados

### Backend (13 arquivos)
- `arrecadacao-application/src/main/java/.../dto/UsuarioMusicaResumoResponse.java`
- `arrecadacao-application/src/main/java/.../handlers/BuscarPagamentoPorIdQueryHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/ListarPagamentosQueryHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/RegistrarPagamentoCommandHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/EstornarPagamentoCommandHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/ListarLicencasQueryHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/BuscarLicencaPorIdQueryHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/CriarLicencaCommandHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/SuspenderLicencaCommandHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/EncerrarLicencaCommandHandler.java`
- `arrecadacao-application/src/main/java/.../handlers/ReativarLicencaCommandHandler.java`
- `arrecadacao-application/src/test/.../EncerrarLicencaCommandHandlerTest.java`
- `arrecadacao-application/src/test/.../ReativarLicencaCommandHandlerTest.java`
- `arrecadacao-application/src/test/.../SuspenderLicencaCommandHandlerTest.java`
- `arrecadacao-application/src/test/.../CriarLicencaCommandHandlerTest.java`
- `arrecadacao-application/src/test/.../ListarLicencasQueryHandlerTest.java`

### Frontend (4 arquivos)
- `src/features/arrecadacao/licencas/types/licenca.ts`
- `src/features/arrecadacao/licencas/components/LicencasTable.tsx`
- `src/features/arrecadacao/licencas/pages/LicencaDetailPage.tsx`
- `src/features/arrecadacao/licencas/components/LicencaForm.tsx`

---

## Próximos Passos

1. **Deploy** do backend (arrecadacao-api) e frontend para `https://mcad.tasso.dev.br`
2. **Reexecutar** CT-04 da task 07 via curl contra produção para confirmar `cnpj` com valor não formatado
3. **Criar PRs** para as 4 discrepâncias não-bloqueantes da task 03

---

*Relatório gerado pelo QA Orchestrator — reexecução*
*Data: 2026-06-13*
