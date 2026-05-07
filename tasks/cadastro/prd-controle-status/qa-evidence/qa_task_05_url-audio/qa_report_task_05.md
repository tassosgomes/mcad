# QA Report — qa_task_05_url-audio

**Status:** FAIL
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero definir/editar a URL de áudio de um fonograma em status PENDENTE_*, e impedir edição em LIBERADO/DEPURADO.

## Descoberta de Endpoint

O PRD menciona "PUT /fonogramas/{id} com urlAudio". A implementação usa endpoint dedicado:
- `PATCH /api/v1/fonogramas/{id}/url-audio` com body `{"url": "..."}`
- O PUT /fonogramas/{id} aceita o campo mas o ignora (não persiste urlAudio)

## Cenários Executados

### SC1 — PATCH url-audio em PENDENTE_VALIDACAO
- **Resultado:** PASS
- PATCH /fonogramas/8b860050.../url-audio com `{"url":"https://cdn.example.com/audio/test01.mp3"}`
- HTTP 200, response body contém `urlAudio: "https://cdn.example.com/audio/test01.mp3"`
- DB confirma: `UrlAudio = 'https://cdn.example.com/audio/test01.mp3'`

### SC2 — PATCH url-audio em PENDENTE_DOCUMENTACAO
- **Resultado:** PASS
- PATCH /fonogramas/e491bbe0.../url-audio → HTTP 200
- Response body contém urlAudio corretamente

### SC3 — PATCH url-audio em LIBERADO (espera 422)
- **Resultado:** PASS
- PATCH /fonogramas/271647ce.../url-audio em fonograma LIBERADO → HTTP 422
- detail: "URL de áudio não pode ser alterada nesse status"

### SC4 — GET /fonogramas/{id} retorna urlAudio
- **Resultado:** FAIL
- GET /fonogramas/8b860050... após PATCH bem-sucedido → `urlAudio: null`
- DB confirma que `UrlAudio = 'https://cdn.example.com/audio/test01.mp3'`
- **BUG:** GET /fonogramas/{id} não retorna o campo urlAudio mesmo quando preenchido no banco

### SC5 — DB verify UrlAudio
- **Resultado:** PASS
- `SELECT UrlAudio FROM cadastro.fonogramas WHERE Id = '8b860050...'`
- → `UrlAudio = 'https://cdn.example.com/audio/test01.mp3'`

## Bugs Encontrados

### BUG-05 — GET /fonogramas/{id} não retorna campo urlAudio
- **Severidade:** Alta
- **Descrição:** Após PATCH /url-audio com sucesso (DB confirma persistência), o GET /fonogramas/{id} retorna `urlAudio: null`. O response do PATCH retorna o campo corretamente, mas o GET usa query diferente ou mapeamento diferente que não inclui o campo.
- **Reprodução:** PATCH /fonogramas/{id}/url-audio → GET /fonogramas/{id} → urlAudio sempre null
- **Nota:** O campo `urlAudio` aparece corretamente no response do PATCH e no response de /liberar.

### BUG-06 — PUT /fonogramas/{id} com urlAudio não persiste o campo
- **Severidade:** Média
- **Descrição:** O endpoint PUT /fonogramas/{id} aceita o campo `urlAudio` no body sem erro (HTTP 200) mas não persiste o valor. Endpoint dedicado PATCH /url-audio deve ser usado.
- **Impacto:** Divergência entre documentação do PRD ("PUT inclui urlAudio") e implementação.

## Evidências DB

```sql
SELECT "Id", "Status", "UrlAudio" FROM cadastro.fonogramas
WHERE "Id" = '8b860050-9b04-4813-b7fa-a99d0716973d';
-- 8b860050 | PENDENTE_VALIDACAO | https://cdn.example.com/audio/test01.mp3

SELECT "Id", "Status", "UrlAudio" FROM cadastro.fonogramas
WHERE "Id" = '271647ce-5c0c-4961-871d-3612f3eccac3';
-- 271647ce | LIBERADO | https://cdn.example.com/audio/lib.mp3 (não alterado após tentativa)
```

## Resultado Final

**FAIL** — BUG-05 crítico: o endpoint GET /fonogramas/{id} não expõe o campo urlAudio. A persistência funciona (confirmada pelo DB), mas a API de leitura está quebrada para este campo.
