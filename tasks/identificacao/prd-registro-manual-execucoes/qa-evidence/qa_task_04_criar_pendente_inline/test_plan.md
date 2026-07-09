# Test Plan — qa_task_04: Criar obra/fonograma pendente inline (RF-03)

## API Tests

| # | Test Case | Endpoint | Expected | Priority |
|---|---|---|---|---|
| API-01 | Create pending obra with valid title and tipo | POST /api/v1/obras | 201, response with id, titulo, tipoObra, status=8 (PENDENTE) | Critical |
| API-02 | Create pending obra with only titulo (no tipo) | POST /api/v1/obras | 201 or uses default? Test both | High |
| API-03 | Create pending obra with missing titulo | POST /api/v1/obras | 400 (titulo required) | High |
| API-04 | Create pending obra with empty titulo | POST /api/v1/obras | 400 (titulo required) | High |
| API-05 | Verify created pending obra via busca | GET /api/v1/busca?q={titulo} | 200, results include created obra | High |
| API-06 | Create pending fonograma with ISRC and obraId | POST /api/v1/fonogramas | 201, response with id, isrc, obraId, status=8 (PENDENTE) | Critical |
| API-07 | Create pending fonograma without ISRC | POST /api/v1/fonogramas | 400 (ISRC required per 2026-06-19) | Critical |
| API-08 | Create pending fonograma without obraId | POST /api/v1/fonogramas | 400 (phonogram must link to obra) | Critical |
| API-09 | Create pending fonograma with invalid ISRC format | POST /api/v1/fonogramas | 400 or 201 (depends on validation) | Medium |
| API-10 | Create pending fonograma with non-existent obraId | POST /api/v1/fonogramas | 400 or 404 (obra not found) | Medium |
| API-11 | Verify created pending fonograma via busca | GET /api/v1/busca?q={isrc} | 200, results include created fonograma | High |

## UI Tests

| # | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| UI-01 | Search no results → "Criar obra pendente" option | Login → ABERTA captação → Add Execução → type non-matching term in busca autocomplete | Footer shows "Criar obra pendente" option | Critical |
| UI-02 | Search no results → "Criar fonograma pendente" option | Same as UI-01 but search for phonogram | Footer shows "Criar fonograma pendente" option | High |
| UI-03 | CriarObraPendenteModal full flow | Click "Criar obra pendente" → fill titulo → confirm | Modal closes, autocomplete filled with new obra | Critical |
| UI-04 | CriarObraPendenteModal validate required fields | Open modal → leave titulo empty → try confirm | Validation error, titulo is required | High |
| UI-05 | CriarFonogramaPendenteModal full flow | Select existing work in autocomplete → search phonogram → no results → click "Criar fonograma pendente" → fill ISRC → confirm | Modal closes, autocomplete filled with new fonograma | Critical |
| UI-06 | CriarFonogramaPendenteModal ISRC required | Open modal → leave ISRC empty → try confirm | Validation error, ISRC is required | Critical |
| UI-07 | CriarFonogramaPendenteModal without prior work selection | Search phonogram without selecting work first → click "Criar fonograma pendente" | Should show work selection or link modal | High |
| UI-08 | Execution with pending work → PENDENTE status | Create execution using pending work → save | Execution status shows PENDENTE | Critical |
| UI-09 | Execution with pending phonogram → PENDENTE status | Create execution using pending phonogram → save | Execution status shows PENDENTE | Critical |
| UI-10 | Both work+phonogram pending → PENDENTE status | Create pending work first, then pending phonogram linked to it → create execution | Execution status shows PENDENTE | Critical |
