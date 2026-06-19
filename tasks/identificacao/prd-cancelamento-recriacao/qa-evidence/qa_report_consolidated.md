# QA Report Consolidado — F06: Cancelamento e Recriação

**Data:** 2026-06-19 (2 tentativas + investigação de causa-raiz)  
**Ambiente:** Frontend `https://mcad.tasso.dev.br` | Backend `https://mcad-identificacao.tasso.dev.br/api/v1`  
**Usuário de teste:** `analista_identificacao`

---

## Sumário Executivo

| Resultado | Quantidade |
|-----------|-----------|
| Tasks executadas | 3 |
| **PASS (parcial)** | 1 |
| **FAIL** | 0 |
| **BLOCKED** | 3 |

**Conclusão:** A feature F06 está parcialmente implantada. Os endpoints `pode-cancelar` e `cancelar` estão operacionais com validações corretas. Porém, a **ausência de captações FECHADAS**, combinada com falhas na criação de dados de teste (cadeia de erros na integração com Cadastro), impede a validação completa do fluxo de cancelamento e recriação.

> **Atualização (investigação de causa-raiz):** Os dois bloqueadores originais (401 no worker e 403 em `/busca`) foram diagnosticados e corrigidos em código. Ver seção **Análise de Causa-Raiz** abaixo.

---

## Resultado Detalhado por Task

### qa_task_01 — Cancelamento de Rol Fechado (RF-01 + RF-02)
**Status:** PARCIAL — 3/7 PASS, 4/7 BLOCKED

| # | Cenário | Status |
|---|---------|--------|
| 1 | Login | PASS |
| 2 | Botão visível em FECHADA | BLOCKED |
| 3 | Cancelar com justificativa válida | BLOCKED |
| 4 | Justificativa inválida | PASS |
| 5 | ABERTA sem botão | PASS |
| 6 | CANCELADA sem botão | BLOCKED |
| 7 | Bloqueio distribuição | BLOCKED |

### qa_task_02 — Opções de Recriação (RF-03)
**Status:** BLOCKED — Depende de cancelamento bem-sucedido (qa_task_01 cenário 3)

### qa_task_03 — Feedback Visual (RF-05)
**Status:** BLOCKED — Requer captação CANCELADA e `distribuicaoProcessada = true`

---

## Análise de Causa-Raiz — Autenticação Cross-Service (Identificação → Cadastro)

A investigação apurou que o sintoma "An unexpected error occurred" ao adicionar uma execução manual (payload com `obraId: null`) é resultado de **dois bugs encadeados** na fronteira Identificação → Cadastro.

### Bug 1 — Contract mismatch (`obraId: null` no payload) — CAUSA IMEDIATA

- **Frontend** (`BuscaCadastroAutocomplete.tsx:handleSelect`) usava `item.obraId` diretamente para montar a seleção.
- **Backend** (`BuscaCadastroQueryHandler.cs:34`) retorna `ObraId: null` para resultados do tipo `obra` (o id da obra fica em `Id`); `ObraId` só é populado para `fonograma` (id da obra vinculada).
- Resultado: ao selecionar uma **obra**, o payload de `POST /execucoes` era enviado com `obraId: null`.

### Bug 2 — Ausência de auth M2M no `CadastroHttpClient` (401 → 500) — CAUSA ESTRUTURAL

- Mesmo com `obraId` correto, o `CriarExecucaoCommandHandler.cs:63` chama `_cadastroClient.GetObraByIdAsync(...)` para enriquecer a execução.
- `CadastroHttpClient` (`ExternalServices/CadastroHttpClient.cs`) **não anexava header `Authorization`** em nenhuma chamada.
- Com `FallbackPolicy = RequireAuthenticatedUser()` no Cadastro (`Program.cs:220-231`), a chamada cross-service sem token retorna **401** → `HttpRequestException` não tratada → **500 "An unexpected error occurred"**.
- O mesmo gargalo afeta todos os 8 consumidores de `ICadastroHttpClient` (CsvProcessorWorker, Criar/AtualizarExecucao, CancelarRol, ResolverPendente, ValidarPreRequisitos, etc.), não apenas a criação manual.
- **Contraste:** o padrão M2M (`client_credentials`) já existia no próprio serviço para o storage-service (`LogToM2MTokenService` + `StorageServiceClient`), mas nunca foi aplicado ao client do Cadastro.

### Por que o validator não capturou o `Guid.Empty`

- `CriarExecucaoCommandValidator` exige `ObraId.NotEmpty()`, mas o `Dispatcher` (`Common/Dispatcher.cs:21-26`) **não invoca validators** — resolve o handler e o executa diretamente. Logo, `null` → `Guid.Empty` chegava ao handler sem validação prévia.

---

## Correções Aplicadas

| # | Arquivo | Correção |
|---|---------|----------|
| 1 | `frontend/.../BuscaCadastroAutocomplete.tsx` | `handleSelect` agora deriva `obraId` corretamente: `item.tipo === 'fonograma' ? item.obraId : item.id` |
| 1 | `frontend/.../types/execucao.ts` | `ResultadoBusca.obraId` passou a `string \| null` refletindo o contrato real do backend |
| 2 | `4-Infra/.../ExternalServices/CadastroOptions.cs` | Novo: opções de M2M (issuer, clientId, clientSecret, resource, scope) |
| 2 | `4-Infra/.../ExternalServices/CadastroM2MTokenService.cs` | Novo: obtém/cacheia/renova token `client_credentials` (espelha `LogToM2MTokenService`) |
| 2 | `4-Infra/.../ExternalServices/CadastroAuthHandler.cs` | Novo: `DelegatingHandler` que anexa `Authorization: Bearer` em toda chamada ao Cadastro (no-op quando não configurado) |
| 2 | `1-Services/.../Program.cs` | Registra `CadastroOptions`, `CadastroM2MTokenService` (singleton) e `CadastroAuthHandler` no typed client `ICadastroHttpClient` |
| 2 | `services/identificacao-api/.env.example` | Documenta `CADASTRO_LOGTO_*` (CLIENT_ID/SECRET/RESOURCE/SCOPE/ISSUER) |

**Validação:** `dotnet build` (0 erros) · `tsc --noEmit` (0 erros) · 173 testes .NET OK · 180 testes frontend OK.

---

## Pendências Operacionais (fora do código)

Para o fix de auth M2M funcionar no ambiente QA/prod, é necessário provisionamento:

1. **Criar Machine Identity (M2M) no Logto** para a Identificação chamar o Cadastro (client_credentials).
2. **Conceder ao M2M, no `ecad-authz`, permissões de leitura**: no mínimo `cadastro:default:obra:listar`, `cadastro:default:obra:visualizar`, `cadastro:default:fonograma:visualizar`, e o que os demais handlers exigirem.
3. **Preencher** `CADASTRO_LOGTO_CLIENT_ID/SECRET/RESOURCE/SCOPE` no `.env` do ambiente (QA/Swarm). Sem isso, o handler loga warning e as chamadas seguem recebendo 401 sob `AUTH_ENABLED=true`.
4. **(Recomendado) Ligar validação no `Dispatcher`** para que commands inválidos (ex.: `Guid.Empty`) retornem 400 em vez de chegar ao handler.

---

## Achados Críticos (Nova Tentativa)

### Funcionalidades OK
1. Endpoints `pode-cancelar` e `cancelar` implantados e respondendo
2. Validação de justificativa (mín 10 chars) correta (400)
3. Regra "apenas FECHADAS canceláveis" aplicada (422)
4. Fechamento requer >= 1 execução (422 com validação detalhada)
5. Campos novos (`distribuicaoProcessada`, `justificativaCancelamento`, etc.) presentes nos responses

### Bloqueadores — Status pós-correção
1. **0 captações FECHADAS** — sem dados de teste (ainda pendente; criação manual agora desbloqueada após fixes 1+2+provisionamento)
2. **0 captações CANCELADAS** — sem histórico (depende de #1)
3. ~~**Worker CSV retorna 401** ao chamar Cadastro API~~ → **CORRIGIDO em código** (fix 2); falta provisionamento M2M no ambiente
4. ~~**Analista sem acesso ao Cadastro**~~ → **RESOLVIDO** pelo usuário (permissões atribuídas; `/busca` funcionando)

---

## Recomendações

| Prioridade | Ação | Status |
|-----------|------|--------|
| ALTA | Autenticação M2M do `CadastroHttpClient` (401) | ✅ Corrigido em código — pendente provisionamento Logto/authz |
| ALTA | Corrigir `obraId: null` no autocomplete (contract mismatch) | ✅ Corrigido |
| ALTA | Provisionar M2M no Logto + permissões no ecad-authz | ⏳ Operacional |
| ALTA | Popular ao menos 1 captação FECHADA com execuções para testes | ⏳ Agora viável após fixes |
| MÉDIA | Ligar validação no `Dispatcher` (defesa contra `Guid.Empty`) | ⏳ Recomendado |
| MÉDIA | Simular `distribuicao.rol.processado` para testar bloqueio | ⏳ |

---

## Evidências

| Arquivo | Descrição |
|---------|-----------|
| `qa_session.json` | Configuração da sessão QA |
| `test-plan.md` | Plano de testes aprovado |
| `qa_task_01_cancelar_rol_fechado/screenshots/01_aberta_no_cancelar_rol_button.png` | UI: ABERTA sem Cancelar Rol |
| `qa_task_01_cancelar_rol_fechado/requests.log` | Log completo de requisições API |
| `qa_task_01_cancelar_rol_fechado/qa_report_task_01.md` | Relatório detalhado |
| `qa_task_02_opcoes_recriacao/qa_report_task_02.md` | BLOCKED |
| `qa_task_03_feedback_visual_frontend/qa_report_task_03.md` | BLOCKED |
