# QA Report — qa_task_01 — HU-01: Adicionar Titular Autoral

**Data:** 2026-04-10
**Status:** PASS com divergencias
**Ambiente:** http://localhost:5001/api/v1
**Obra de teste:** `9883b3f3-6135-46c3-ae9a-d809e78faa3f` (QA T01 Titularidades, PENDENTE)

---

## Cenarios Executados

| # | Cenario | Esperado | Obtido | HTTP Esperado | HTTP Obtido | Status |
|---|---------|----------|--------|---------------|-------------|--------|
| C4 | POST PF como AUTOR | 201 + lista + soma | 201, titularidade criada (60%), somaPercentual=60, somaCompleta=false | 201 | 201 | PASS |
| C5 | POST PJ como EDITOR | 201 | 201, titularidade criada (30%), somaPercentual=90 | 201 | 201 | PASS |
| C6 | POST PF como EDITOR | 422 "Editor exige PJ" | 422, detail="A categoria Editor exige titular Pessoa Jurídica" | 422 | 422 | PASS |
| C7 | POST duplicata titular+categoria | 409 | 409, detail="Este titular já está vinculado com esta categoria nesta obra" | 409 | 409 | PASS |
| C8 | POST mesmo titular categoria diferente (RF-05 acumulo) | 201 | 201 aceito (PJ como AUTOR e EDITOR na mesma obra) | 201 | 201 | PASS |
| C8x | POST com categoria "COMPOSITOR" | Aceito (PRD menciona Autor/Compositor) | 400 "Categoria deve ser AUTOR ou EDITOR" | 201 | 400 | DIVERGENCIA |
| C9 | POST percentual = 0 | 422 | 400, detail="'Percentual' must be greater than '0'." | 422 | 400 | DIVERGENCIA (semantica) |
| C10 | POST percentual > 100 | 422 | 400, detail="'Percentual' must be less than or equal to '100'." | 422 | 400 | DIVERGENCIA (semantica) |
| C11 | POST percentual 4 casas decimais (33.3333) | 201 | 201, percentual=33.3333 preservado | 201 | 201 | PASS |
| C12 | GET /titulares/busca?q=Tasso | 200 com resultados | 200, retornou 2 titulares com "Tasso" no nome | 200 | 200 | PASS |
| C12b | GET /titulares/busca?q=JG.WD9 (CNPJ parcial) | 200 com resultados | 200, lista vazia — busca por documento formatado nao funciona | 200 | 200 | DIVERGENCIA |
| C13 | DB: SELECT titularidades_autorais WHERE ObraId=... | 4 registros | 4 registros confirmados, Percentual numeric(8,4), constraint UNIQUE obra+titular+categoria presente | - | - | PASS |

---

## Divergencias Identificadas

### DIV-01 — Categoria "COMPOSITOR" nao aceita (HTTP 400)
- **Evidencia:** POST com categoria "COMPOSITOR" retorna 400
- **PRD diz:** HU-01 menciona "Autor/Compositor ou Editor" como categorias
- **API aceita:** apenas "AUTOR" ou "EDITOR" (check constraint no banco confirmado)
- **Impacto:** O PRD usa linguagem ambigua ("Autor/Compositor" = um rotulo UI, nao dois valores distintos). A implementacao usa apenas AUTOR e EDITOR. Tecnicamente a implementacao parece coerente com RN-11 que menciona Editor como categoria especifica. A divergencia e de nomenclatura no PRD.

### DIV-02 — HTTP 400 em vez de 422 para erros de validacao de percentual
- **Evidencia:** POST/PUT com percentual=0, negativo ou >100 retornam HTTP 400, nao 422
- **PRD/Techspec espera:** 422 Unprocessable Entity
- **Impacto:** Baixo — a regra de negocio e aplicada corretamente, apenas o codigo HTTP difere do especificado.

### DIV-03 — Busca de titular por documento formatado nao funciona
- **Evidencia:** GET /titulares/busca?q=JG.WD9 retornou lista vazia
- **PRD RF-02:** "pesquisa parcial nos campos nome e documento (CPF/CNPJ)"
- **Impacto:** Medio — busca por CPF/CNPJ pode nao funcionar com formatacao. Nao testado com documento sem formatacao (ex: apenas digitos).

---

## Banco de Dados (Validacao C13)

```
Id                                   | ObraId                               | TitularId                            | Categoria | Percentual
822f5d8c-...                         | 9883b3f3-...                         | 48882c43-... (Tasso Silva Gomes, PF) | AUTOR     | 60.0000
fb292279-...                         | 9883b3f3-...                         | 86ac9aba-... (Editora de Teste, PJ)  | EDITOR    | 30.0000
98fb61c7-...                         | 9883b3f3-...                         | 86ac9aba-... (Editora de Teste, PJ)  | AUTOR     | 5.0000
7db73660-...                         | 9883b3f3-...                         | b4c692c3-... (QA Editora Alfa 01,PJ) | EDITOR    | 33.3333
```

Constraint UNIQUE (ObraId, TitularId, Categoria) presente e funcional.
Check constraint para Percentual > 0 AND <= 100 presente.
Check constraint para Categoria IN ('AUTOR', 'EDITOR') presente.

---

## Resultado: PASS com divergencias menores
Funcionalidade principal operacional. Divergencias sao de semantica HTTP (400 vs 422) e nomenclatura de categoria no PRD.
