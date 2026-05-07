# QA Report — qa_task_06_liberar-fonograma

**Status:** PASS
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero liberar um fonograma quando todos os pré-requisitos estiverem atendidos: ISRC, participações conexas = 100%, obra LIBERADA e URL de áudio preenchida.

## Setup

- Obra base liberada: `d066a39e` (LITEROMUSICAL, LIBERADA)
- Fonograma de teste: `e491bbe0` (BRQF02600002, PENDENTE_DOCUMENTACAO, conexos=100%, urlAudio definida)

## Cenários Executados

### SC1 — Liberar fonograma completo
- **Resultado:** PASS
- POST /fonogramas/e491bbe0.../liberar → HTTP 200
- Response: status=LIBERADO, urlAudio="https://cdn.example.com/audio/test02.mp3"

### SC2 — Fonograma com obra PENDENTE (espera 422)
- **Resultado:** PASS
- Fonograma BRQF02600005 criado com obra PENDENTE (4b0a0174)
- POST /liberar → HTTP 422, pendencias[]:
  - ISRC: atendido=true
  - Participações Conexas: atendido=true
  - Obra LIBERADA: atendido=false (detalhe: "Obra vinculada não está LIBERADA")
  - URL Áudio: atendido=true

### SC3 — Fonograma sem urlAudio (espera 422)
- **Resultado:** PASS
- Fonograma BRQF02600006 criado sem urlAudio
- POST /liberar → HTTP 422, pendencias[]:
  - ISRC: atendido=true
  - Participações Conexas: atendido=true
  - Obra LIBERADA: atendido=true
  - URL Áudio: atendido=false (detalhe: "URL de áudio não preenchida")

### SC4 — Liberar em PENDENTE_VALIDACAO (espera erro)
- **Resultado:** PASS
- Fonograma BRQF02600007 em PENDENTE_VALIDACAO
- POST /liberar → HTTP 409 "Apenas fonogramas em PENDENTE_DOCUMENTACAO podem ser liberados."

### SC5 — DB verify Status=LIBERADO
- **Resultado:** PASS
- `SELECT Status FROM cadastro.fonogramas WHERE Id = 'e491bbe0...'` → LIBERADO

## Evidências DB

```sql
SELECT "Id", "Isrc", "Status" FROM cadastro.fonogramas
WHERE "Id" = 'e491bbe0-b12d-4b26-a276-c6396c232bbf';
-- e491bbe0 | BRQF02600002 | LIBERADO
```

## Resultado Final

**PASS** — Todos os cenários passaram. A lógica de validação de pré-requisitos (pendencias[]) para liberação de fonograma funciona corretamente.
