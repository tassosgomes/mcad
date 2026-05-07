# Relatório Consolidado de QA — F07: Controle de Status

**PRD:** tasks/cadastro/prd-controle-status/prd.md
**Techspec:** tasks/cadastro/prd-controle-status/techspec.md
**Data de execução:** 2026-04-10
**Ambiente:** http://localhost:5001/api/v1
**Banco:** PostgreSQL — db.tasso.dev.br:5432, schema cadastro

---

## Sumário de Resultados

| Task | Descrição | Status |
|---|---|---|
| qa_task_01 | Liberar obra | FAIL |
| qa_task_02 | Bloquear obra | FAIL |
| qa_task_03 | Desbloquear obra | PASS |
| qa_task_04 | Transição auto fonograma | PASS |
| qa_task_05 | URL de áudio | FAIL |
| qa_task_06 | Liberar fonograma | PASS |
| qa_task_07 | Bloquear/desbloquear fonograma | PASS |
| qa_task_08 | Controle de acesso | PASS |
| qa_task_09 | UI ObraDetailPage | SKIPPED |
| qa_task_10 | UI FonogramaDetailPage | SKIPPED |

**6 tasks executadas** | **4 PASS** | **3 FAIL** | **2 SKIPPED** | **0 BLOCKED**

---

## Bugs Encontrados

### BUG-01 — ValidadorLiberacaoObra: tipo MUSICAL bloqueado como "não preenchido"
- **Severidade:** Alta
- **Task:** qa_task_01
- **Descrição:** `ValidadorLiberacaoObra.cs:12` usa `obra.Tipo != default` para validar se o tipo foi preenchido. Como `TipoObra.Musical` é o primeiro valor do enum (valor inteiro 0), ele é igual ao `default(TipoObra)`, fazendo com que obras do tipo MUSICAL sempre falhem na validação de liberação com pendência `Tipo: atendido=false`.
- **Impacto:** Obras com tipo MUSICAL — o tipo mais comum — nunca podem ser liberadas pelo endpoint.
- **Reprodução:** Criar obra tipo=MUSICAL com ISWC e titularidades=100% → POST /liberar → HTTP 422 `Tipo: false`
- **Localização:** `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs:12`
- **Sugestão de correção:** Substituir `obra.Tipo != default` por verificação de string não vazia ou uso de enum Nullable.

### BUG-02 — Response do POST /titularidades retorna campos como null
- **Severidade:** Baixa (cosmética)
- **Task:** qa_task_01
- **Descrição:** POST /obras/{id}/titularidades retorna `{"titularId": null, "categoria": null, "percentual": null}`. A criação ocorre corretamente (confirmado via GET /titularidades), mas o response não informa sucesso adequadamente.
- **Impacto:** Clientes da API não conseguem confirmar a criação pelo response do POST.

### BUG-03 — GET /obras/{id} não retorna campo bloqueioJustificativa
- **Severidade:** Média
- **Task:** qa_task_02
- **Descrição:** Após bloquear uma obra com justificativa, GET /obras/{id} retorna `bloqueioJustificativa: null`. O banco confirma que o campo está salvo. O response do POST /bloquear retorna corretamente.
- **Impacto:** Clientes que buscam uma obra bloqueada não conseguem ver a justificativa do bloqueio pelo GET.
- **Análogo:** BUG-05 tem comportamento idêntico para GET /fonogramas/{id} e urlAudio.

### BUG-04 — POST /obras/{id}/bloquear sem body retorna HTTP 500
- **Severidade:** Média
- **Task:** qa_task_02
- **Descrição:** Enviar POST /bloquear sem body retorna HTTP 500 "Required parameter 'BloquearObraCommand commandArgs' was not provided from body." Deveria ser HTTP 400.
- **Impacto:** Expõe detalhes de implementação interna. Clientes que enviam request malformado recebem 500.
- **Afeta também:** Provavelmente afeta POST /bloquear de fonogramas pelo mesmo padrão.

### BUG-05 — GET /fonogramas/{id} não retorna campo urlAudio
- **Severidade:** Alta
- **Task:** qa_task_05
- **Descrição:** Após PATCH /fonogramas/{id}/url-audio com sucesso (DB confirma persistência), GET /fonogramas/{id} retorna `urlAudio: null`. O PATCH e o endpoint /liberar retornam o campo corretamente.
- **Impacto:** Frontend e clientes da API não conseguem exibir a URL de áudio atual de um fonograma via GET. Este campo é pré-requisito para a liberação — a inconsistência pode confundir integrações.
- **Reprodução:** PATCH /url-audio → GET /fonogramas/{id} → urlAudio null

### BUG-06 — PUT /fonogramas/{id} com urlAudio não persiste o campo
- **Severidade:** Média
- **Task:** qa_task_05
- **Descrição:** PUT /fonogramas/{id} aceita o campo `urlAudio` no body sem erro (HTTP 200) mas não persiste o valor. O endpoint correto é PATCH /fonogramas/{id}/url-audio.
- **Impacto:** Divergência entre documentação do PRD e implementação. Risco de integração silenciosa incorreta.

---

## Funcionalidades Validadas (PASS)

### Desbloquear obra (qa_task_03)
- Transição BLOQUEADO → PENDENTE funciona corretamente
- Endpoint retorna status PENDENTE (não LIBERADO)
- Bloqueio em não-BLOQUEADO retorna 422
- Histórico registra BLOQUEIO e DESBLOQUEIO com timestamps e justificativa corretos
- GET /historico-bloqueios retorna array ordenado (mais recente primeiro)

### Transição auto fonograma (qa_task_04)
- POST /participacoes/calcular com soma=100% transiciona PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO
- DB confirma a mudança de status
- somaCalculada=true e percentuaisDesatualizados=false no response

### Liberar fonograma (qa_task_06)
- Liberação com todos os pré-requisitos: HTTP 200, status=LIBERADO
- Obra não LIBERADA → 422 pendencias[Obra LIBERADA=false]
- Sem urlAudio → 422 pendencias[URL Áudio=false]
- Liberar PENDENTE_VALIDACAO → 409 (somente PENDENTE_DOCUMENTACAO aceito)

### Bloquear/desbloquear fonograma (qa_task_07)
- Bloquear PENDENTE_VALIDACAO e LIBERADO: ambos retornam BLOQUEADO
- Justificativa < 10 chars → 400
- Desbloquear → PENDENTE_VALIDACAO (início do ciclo)
- GET /historico-bloqueios retorna array com BLOQUEIO e DESBLOQUEIO
- DB confirma EntidadeTipo=FONOGRAMA nos registros

### Controle de acesso (qa_task_08)
- Consultor recebe 403 em todas as operações de status (liberar, bloquear, desbloquear — obras e fonogramas)
- Sem token recebe 401

---

## Observações de Implementação

### Endpoint de URL de Áudio
O PRD descreve "PUT /fonogramas/{id} inclui urlAudio" mas a implementação usa `PATCH /api/v1/fonogramas/{id}/url-audio`. O endpoint PATCH é o correto e funciona. O PUT aceita o campo mas o ignora silenciosamente. Documentação deve ser atualizada.

### Response do POST /participacoes
Assim como o POST /titularidades (BUG-02), o POST /participacoes retorna campos como null mas a criação ocorre corretamente. O padrão de response destes endpoints de criação precisa ser revisado.

### Tipo MUSICAL como default do enum
O BUG-01 reflete um problema de design: usar `!= default` para validar enum é frágil quando o valor mais comum é o primeiro (zero). Uma abordagem mais robusta seria usar `Nullable<TipoObra>` na entidade ou uma propriedade booleana explícita `TipoDefinido`.

---

## Tasks UI Skipped

As tasks qa_task_09 e qa_task_10 foram marcadas como SKIPPED porque:
1. O servidor frontend (http://localhost:5173) não estava em execução
2. Não há configuração de Playwright no projeto (`playwright.config.ts` ausente)
3. Não há diretório `e2e/` no frontend

O Playwright CLI (v1.58.2) está instalado no sistema. Para executar os testes de UI, seria necessário iniciar o frontend e criar os testes E2E.

---

## Evidências

Relatórios individuais disponíveis em:
- `qa-evidence/qa_task_01_liberar-obra/qa_report_task_01.md`
- `qa-evidence/qa_task_02_bloquear-obra/qa_report_task_02.md`
- `qa-evidence/qa_task_03_desbloquear-obra/qa_report_task_03.md`
- `qa-evidence/qa_task_04_transicao-auto-fonograma/qa_report_task_04.md`
- `qa-evidence/qa_task_05_url-audio/qa_report_task_05.md`
- `qa-evidence/qa_task_06_liberar-fonograma/qa_report_task_06.md`
- `qa-evidence/qa_task_07_bloquear-desbloquear-fonograma/qa_report_task_07.md`
- `qa-evidence/qa_task_08_controle-acesso/qa_report_task_08.md`
- `qa-evidence/qa_task_09_ui-obra/qa_report_task_09.md`
- `qa-evidence/qa_task_10_ui-fonograma/qa_report_task_10.md`
