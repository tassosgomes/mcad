# QA Report — Task 03: Listar e Filtrar Titulares

**Task ID:** qa_task_03  
**User Story:** HU-03 — Listagem paginada com filtros (nome, doc, associação, status), ordenação, paginação server-side  
**Data de execução:** 2026-04-08  
**Executado por:** QA Orchestrator (re-execução pós-correção de bugs)  
**Status geral:** PASS

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 8 |
| PASS | 8 |
| FAIL | 0 |
| Cobertura | RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19 |

---

## Casos de Teste

### TC03-01 — Listagem default (sem parâmetros)
**Tipo:** API  
**Status:** PASS  
**Evidência:**
- HTTP 200
- `pagination.page = 1`
- `pagination.size = 20` (default RF-13)
- `pagination.total = 9` (total de registros no banco)
- `pagination.totalPages` presente
- `data` com lista de titulares

---

### TC03-02 — Filtro por nome parcial case-insensitive
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET ?nome=QA PF (URL encoded)  
**Evidência:**
- HTTP 200
- Retornou 2 titulares: `["QA PF Reexec 01", "QA PF Segundo"]`
- Filtro parcial e case-insensitive funcionando (RF-15)

---

### TC03-03 — Filtro por associação (ABRAMUS)
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET ?associacaoId={id_abramus}  
**Evidência:**
- HTTP 200
- 4 titulares retornados, todos com `associacao.sigla = "ABRAMUS"`
- Filtro exato por associação (RF-17)

---

### TC03-04 — Filtro por status ATIVO
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET ?status=ATIVO  
**Evidência:**
- HTTP 200
- 9 titulares retornados, todos com `status = "ATIVO"`
- Filtro exato por status (RF-18)

---

### TC03-05 — Filtro por documento alfanumérico parcial
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET ?documento=HM7522MH (parte do CNPJ alfanumérico)  
**Evidência:**
- HTTP 200
- 1 titular retornado com documento `HM7522MH000102`
- Filtro por documento alfanumérico funciona (RF-16)

---

### TC03-06 — Paginação customizada (size=2, page=2)
**Tipo:** API  
**Status:** PASS  
**Evidência:**
- HTTP 200
- `pagination.page = 2`
- `pagination.size = 2`
- `data` com 2 itens (paginação server-side correta — RF-13)

---

### TC03-07 — Ordenação DESC por nome
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET ?sort=-nome&size=3  
**Evidência:**
- HTTP 200
- Nomes retornados em ordem decrescente: `["Tasso Silva Gomes", "QA PF Segundo", "QA PF Reexec 01"]`
- Prefixo `-` para DESC funcionando (RF-14)

---

### TC03-08 — Consultor pode listar titulares
**Tipo:** API  
**Status:** PASS  
**Descrição:** GET /titulares com token do perfil Consultor.  
**Evidência:**
- HTTP 200
- Consultor tem acesso de leitura à listagem

---

## Bugs Identificados

Nenhum novo bug encontrado nesta task.

---

## Conclusão

HU-03 completamente validada. Paginação server-side, todos os filtros (nome parcial, documento parcial alfanumérico, associação exata, status exato) e ordenação com prefixo `-` estão funcionando corretamente. Metadados de paginação (`page`, `size`, `total`, `totalPages`) presentes em todas as respostas.
