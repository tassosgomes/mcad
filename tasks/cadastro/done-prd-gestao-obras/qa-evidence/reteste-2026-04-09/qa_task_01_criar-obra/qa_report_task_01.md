# QA Report — qa_task_01: HU-01 Criar Obra Musical
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Status |
|----|-----------|--------|
| CT-01 | POST /obras com dados válidos → 201 PENDENTE | PASS |
| CT-02 | GET /obras/{id} → status PENDENTE, iswc null | PASS |
| CT-03 [F1] | POST sem titulo → 400 (era 500) | PASS ✓ CORRIGIDO |
| CT-04 [F1] | POST com tipo inválido → 400 (era 500) | PASS ✓ CORRIGIDO |
| CT-05 [F1] | POST sem tipo → 400 | PASS ✓ CORRIGIDO |
| CT-06 [F1] | POST com titulo vazio ("") → 400 | PASS ✓ CORRIGIDO |
| CT-07 DB | Persistência no banco — cadastro.obras_musicais | PASS |
| UI-F4-01 | UI: criar obra via formulário, verificar redirecionamento | PASS |
| UI-F4-03 [F4] | UI: obra aparece na listagem imediatamente após criação | PASS ✓ CORRIGIDO |

**Resultado: 9/9 PASS**

---

## Evidências API

### CT-01: POST /obras válido
```
Request: POST http://localhost:5001/api/v1/obras
Body: {"titulo":"Meu Bem Querer QA","tipo":"LITEROMUSICAL","genero":"MPB"}
Response 201:
{
  "id": "d17d2745-1c47-4c6c-bb2d-db7985c2bfbf",
  "codigo": 26,
  "titulo": "Meu Bem Querer QA",
  "subtitulo": null,
  "tipo": "LITEROMUSICAL",
  "genero": "MPB",
  "iswc": null,
  "status": "PENDENTE",
  "dominioPublico": false,
  "obraDepuradaParaId": null
}
```

### CT-03 [F1 RESOLVIDA]: POST sem título → 400
```
Response 400:
{"title":"Validation Error","status":400,"detail":"Título é obrigatório.",
 "errors":{"Titulo":["Título é obrigatório."]}}
```
**FALHA ANTERIOR CORRIGIDA: antes retornava 500, agora retorna 400 corretamente.**

### CT-04 [F1 RESOLVIDA]: POST com tipo inválido → 400
```
Response 400:
{"title":"Validation Error","status":400,"detail":"Tipo inválido. Valores aceitos: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI"}
```

### CT-05 [F1 RESOLVIDA]: POST sem tipo → 400
```
Response 400:
{"title":"Validation Error","status":400,"detail":"Tipo é obrigatório."}
```

### CT-06 [F1 RESOLVIDA]: POST com titulo vazio → 400
```
Response 400:
{"title":"Validation Error","status":400,"detail":"Título é obrigatório."}
```

---

## Evidência Banco de Dados

```sql
SELECT "Id", "Titulo", "Tipo", "Status", "Iswc" 
FROM cadastro.obras_musicais WHERE "Id" = 'd17d2745-1c47-4c6c-bb2d-db7985c2bfbf';
```
Resultado: 1 linha — Titulo="Meu Bem Querer QA", Tipo="LITEROMUSICAL", Status="PENDENTE", Iswc=NULL

---

## Evidência UI

- Login Keycloak: PASS — redirect correto para http://localhost:5173/cadastro/obras
- Listagem de obras: PASS — 20 linhas na tabela ao carregar
- Nova Obra: botão encontrado e funcional, navega para /cadastro/obras/nova
- Formulário preenchido com titulo "Obra UI QA Reteste 2026" e tipo MUSICAL
- Após salvar: redirecionado para /cadastro/obras (listagem)
- [F4 RESOLVIDA]: título da obra encontrado imediatamente na listagem sem necessidade de reload

Screenshots:
- 01_initial_page.png, 02_after_login.png, 03_obras_listagem.png
- 04_form_criar.png, 05_form_preenchido.png, 06_apos_salvar.png, 07_listagem_apos_criacao.png

---

## Observações

1. Campo `codigo` (sequencial) presente no response — não documentado no API Contract mas funcional.
2. Campo `bloqueioJustificativa` presente no response — não documentado no API Contract.
3. F1 RESOLVIDA: validações retornam 400 com ProblemDetails (title, status, detail, errors).
4. F4 RESOLVIDA: timing de exibição na listagem após criação corrigido.

**STATUS FINAL: PASS**
