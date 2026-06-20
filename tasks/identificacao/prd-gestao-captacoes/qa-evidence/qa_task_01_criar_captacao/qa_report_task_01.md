# QA Report — qa_task_01 Criar Captação (RF-01)

**Task ID:** qa_task_01_criar_captacao
**Data/Hora:** 2026-06-20T01:55Z (re-run final)
**Status Geral:** ✅ PASS
**Resultado anterior:** ❌ FAIL (3 bugs — 500, 404, code CONFLICT — + 403 blocker)

---

## Contexto

- **User Story:** RF-01 — Criar Captação (status ABERTA, analista auto, RN-01 unicidade, validação de campos)
- **Ambiente:** API `https://mcad-identificacao.tasso.dev.br/api/v1` | UI `https://mcad.tasso.dev.br`
- **Tipos de teste:** API + UI
- **Usuário:** analista_identificacao (sub `jrc0vems4r1q`)

---

## Alterações entre execução original (00:40Z) e re-run (01:49Z)

| Caso | Antes | Depois | O que mudou |
|------|-------|--------|-------------|
| CT-01b | **500** Internal Server Error | **400** VALIDATION_ERROR | Schema antigo agora tratado corretamente |
| CT-02 | 409 com code **`CONFLICT`** | 409 com code **`CAPTACAO_DUPLICADA`** | Code de erro corrigido conforme api-contract |
| CT-03 | **404** Not Found | **400** VALIDATION_ERROR | Body vazio agora validado no pipeline |
| CT-04 | **403** Forbidden em `usuarios-musica` | **200** OK (lista vazia) | Permissão corrigida |

**Todos os bugs reportados na execução original foram corrigidos.**

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Criar captação válida (schema correto) | API | ✅ PASS |
| CT-01b | Criar com schema documentado no api-contract (`usuarioDeMusica` texto) | API | ✅ PASS (400 corretamente) |
| CT-02 | Duplicidade rubrica+período (RN-01) | API | ✅ PASS (code `CAPTACAO_DUPLICADA`) |
| CT-03 | Campos obrigatórios ausentes (body vazio) | API | ✅ PASS (400 VALIDATION_ERROR) |
| CT-04 | Criar captação via formulário (UI) | UI | ✅ PASS |
| CT-05 | Validação client-side (submit vazio) | UI | ✅ PASS |

---

## Detalhes

### CT-01 — Criar captação válida ✅ PASS
POST com schema novo (`usuarioMusicaId` + `usuarioMusicaNome`): **201**, `status="Aberta"`, analistaResponsavel preenchido. Fixture `5ec7cddd` criada e removida no cleanup.

### CT-01b — Schema antigo do api-contract ✅ PASS (corrigido)
POST com `usuarioDeMusica` (texto livre, schema do api-contract.md): **400 VALIDATION_ERROR** "One or more validation errors occurred." — tratado corretamente (antes retornava 500).

### CT-02 — RN-01 duplicata ✅ PASS (corrigido)
POST com mesma rubrica+período de captação ativa: **409**, code `CAPTACAO_DUPLICADA`, detail "Já existe uma captação ativa para Rádio AM/FM em 06/20/2026". Tudo conforme `api-contract.md` (antes o code era `CONFLICT`).

### CT-03 — Body vazio ✅ PASS (corrigido)
POST com `{}`: **400 VALIDATION_ERROR** "One or more validation errors occurred." — validação no pipeline (antes retornava 404 "Rubrica não encontrada").

### CT-04 — UI create ✅ PASS (corrigido)
O endpoint `GET /usuarios-musica?q=Tassos` retorna **200 OK** com resultado: "Tassos Maximus Eventos LTDA" (CNPJ 6MLR8E10000130). O fluxo completo de criação via UI foi executado com sucesso:

1. Preencher rubrica: Rádio AM/FM
2. Preencher período: 2026-06-19
3. Selecionar usuário de música: Tassos Maximus Eventos LTDA (via autocomplete)
4. Clicar "Salvar Alterações"

**Resultado:** `POST /captacoes` → **201 Created**. Captação `cb5fff4a` criada com `status="Aberta"`, `usuarioMusicaId="eca1d677..."`, `analistaResponsavel.nome="Analista Identificacao"`. Redirecionamento para a listagem com o novo registro exibido.

**Nota:** O autocomplete depende da existência de registros de Usuário de Música sincronizados da Arrecadação. A busca por "Tassos" encontrou 1 resultado; buscas genéricas podem retornar lista vazia se não houver dados correspondentes.

### CT-05 — Validação client-side ✅ PASS
Submeter formulário vazio → mensagens "Selecione uma rubrica", "Informe o período (data)", "Selecione um usuário de música". Nenhum POST disparado.

---

## Observações

- O schema real (`usuarioMusicaId` + `usuarioMusicaNome`) difere do `api-contract.md` (`usuarioDeMusica` string), mas o tratamento do schema antigo agora é graceful (400 em vez de 500).
- O `api-contract.md` permanece desatualizado quanto ao schema de criação — a documentação deve ser atualizada para refletir os campos `usuarioMusicaId` e `usuarioMusicaNome`.

---

## Resumo de Evidências

```
qa_task_01_criar_captacao/
├── test_plan.md
├── screenshots/
│   ├── ct04_ui_criacao_autocomplete_bloqueado_403.png   (run original)
│   ├── ct04_rerun_usuarios_musica_200.png               (re-run — endpoint funciona)
│   ├── ct04_ui_create_success.png                       (re-run final — criação UI completa)
│   └── ct05_ui_validacao_submit_vazio.png
├── qa_report_task_01.md  ← este arquivo
└── requests.log          ← re-run results incluídos
```

---

## Informações para o Orquestrador

**Status final:** PASS
**Bugs corrigidos desde execução original:** 4/4 corrigidos (500→400, CONFLICT→CAPTACAO_DUPLICADA, 404→400, 403→200)
**Fluxo UI completo confirmado:** criação via formulário com autocomplete funcional → 201 + redirecionamento para listagem
