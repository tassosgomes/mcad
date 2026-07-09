# QA Report Consolidado — F01: Gestão de Captações

**Sessão:** 2026-06-20T00:40Z (re-runs task_01 01:49Z, task_02 02:19Z)
**PRD:** `tasks/identificacao/prd-gestao-captacoes/prd.md`
**TechSpec:** `tasks/identificacao/prd-gestao-captacoes/techspec.md`
**Ambiente:** Frontend `https://mcad.tasso.dev.br` | API `https://mcad-identificacao.tasso.dev.br/api/v1` | BFF `https://mcad-bff.tasso.dev.br`
**Usuários:** analista_identificacao (dono) | ilee / Ira Lee Jr (não-dono, também analista)
**Autenticação:** OIDC/Logto — token extraído do browser (sem ROPC disponível)

---

## Sumário Executivo

| Task | RF | Descrição | Original | Re-run |
|------|----|-----------|----------|--------|
| qa_task_01 | RF-01 | Criar Captação | ❌ FAIL | ✅ PASS |
| qa_task_02 | RF-02 | Listar Captações | ❌ FAIL | ✅ PASS |
| qa_task_03 | RF-03 | Visualizar Detalhe | ✅ PASS | — |
| qa_task_04 | RF-04 | Editar Captação ABERTA | ⚠️ PASS c/ ressalvas | — |
| qa_task_05 | RF-05 | Excluir Captação ABERTA | ⚠️ PASS c/ ressalvas | — |

**Resultado final:** 3/5 PASS pleno | 2/5 PASS com ressalvas | 0/5 FAIL

---

## Bugs Corrigidos (entre execução original e re-runs)

| ID | Descrição | Run original | Re-run |
|----|-----------|-------------|--------|
| BUG-01 | POST `usuarioDeMusica` texto livre | ❌ 500 | ✅ 400 |
| BUG-02 | POST `{}` → | ❌ 404 | ✅ 400 |
| BUG-03 | Filtro `periodoInicio/Fim` ignorado | ❌ todos registros | ✅ total=1 |
| BUG-04 | Filtro `analistaResponsavelId` ignorado | ❌ todos registros | ✅ total=7 |
| BUG-05 | `GET /usuarios-musica` → 403 | ❌ Forbidden | ✅ 200 OK |
| — | 409 code `CONFLICT` (não `CAPTACAO_DUPLICADA`) | ⚠️ wrong code | ✅ `CAPTACAO_DUPLICADA` |

**6/6 bugs e drifts corrigidos entre as execuções.**

---

## Drifts de Contrato Remanescentes (api-contract.md vs implementação)

| Item | Documentado | Implementado | Impacto |
|------|-------------|-------------|---------|
| Campo create | `usuarioDeMusica: string` (texto livre) | `usuarioMusicaId: Guid` + `usuarioMusicaNome: string` | ALTO — api-contract.md desatualizado |
| Enum status | `ABERTA`, `FECHADA`, `CANCELADA` | `Aberta`, `Fechada`, `Cancelada` | MÉDIO |
| RN-08 erro | `403 FORBIDDEN` | `422 Unprocessable Entity` | MÉDIO |
| Envelope GET rubricas | `{data: [...]}` | Array direto `[...]` | BAIXO |
| Endpoints não documentados | — | `/analistas`, `/usuarios-musica` | MÉDIO |
| Arquitetura BFF | Não documentada | Frontend usa `mcad-bff.tasso.dev.br` como proxy | ALTO |

---

## Casos Não Testáveis

| Caso | Task | Motivo |
|------|------|--------|
| Editar captação FECHADA | RF-04 CT-03 | `POST /fechar` exige execuções (F02) — não foi possível produzir FECHADA |
| Rubrica bloqueada com execuções | RF-04 CT-04c | `POST /execucoes` exige obra do Cadastro (F04) |
| Excluir captação FECHADA | RF-05 CT-02 | Mesmo bloqueio do caso acima |
| UI: modal de confirmação de exclusão | RF-05 CT-03 | Perda de sessão do dono após switch para ilee |
| Consultor não cria | RF-01 | ilee também é analista; sem usuário consultor disponível |

---

## Observações

- O frontend usa um **BFF** (`mcad-bff.tasso.dev.br/api/identificacao/v1`) como proxy em vez de chamar a API diretamente. Nenhum documento (PRD, techspec, api-contract) menciona essa arquitetura.
- O campo "Usuário de Música" migrou de texto livre para referência a snapshots sincronizados da Arrecadação (D03). O autocomplete depende da existência desses dados.
- O endpoint `usuarios-musica` funciona corretamente (200) e encontrou "Tassos Maximus Eventos LTDA", validando o fluxo UI completo.
- A página de detalhe inclui seções de Execuções (F02) e Upload CSV (F03) — features implementadas além do escopo F01.

---

## Estrutura de Evidências

```
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md  ← este arquivo
├── qa_task_01_criar_captacao/
│   ├── test_plan.md + qa_report_task_01.md + requests.log
│   └── screenshots/ (5 arquivos — runs original e re-run)
├── qa_task_02_listar_captacoes/
│   ├── test_plan.md + qa_report_task_02.md + requests.log
│   └── screenshots/ (4 arquivos — runs original e re-run)
├── qa_task_03_visualizar_detalhe_captacao/
│   ├── test_plan.md + qa_report_task_03.md + requests.log
│   └── screenshots/ct03_detalhe_resumo_execucoes.png
├── qa_task_04_editar_captacao_aberta/
│   ├── test_plan.md + qa_report_task_04.md + requests.log
│   └── screenshots/ct07_ilee_nao_dono_actions_hidden.png
└── qa_task_05_excluir_captacao_aberta/
    ├── qa_report_task_05.md + requests.log
```

---

## Recommendations

1. **Atualizar `api-contract.md`** com o schema real (`usuarioMusicaId` + `usuarioMusicaNome`), endpoints `/analistas` e `/usuarios-musica`, e corrigir enum de status e RN-08 HTTP code.
2. **Documentar arquitetura BFF** — o proxy `mcad-bff` é um componente arquitetural significativo não documentado.
3. **Corrigir RN-08 HTTP code** — retornar 403 FORBIDDEN em vez de 422 para violação de propriedade.
4. **Sincronizar dados da Arrecadação** no ambiente de staging/QA para que o autocomplete tenha dados e o fluxo de criação seja totalmente funcional sem depender de registros específicos.
