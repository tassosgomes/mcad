# QA Report Consolidado — F04: Titularidades Autorais

**Data:** 2026-04-10
**PRD:** tasks/cadastro/prd-titularidades-autorais/prd.md
**Ambiente:** http://localhost:5001/api/v1
**Banco:** db.tasso.dev.br:5432 / schema cadastro
**Executor:** QA Orchestrator (Claude)

---

## Resumo Executivo

| Task | Historia | Status | Cenarios | Pass | Fail | Divergencia |
|------|---------|--------|----------|------|------|-------------|
| qa_task_01 | HU-01 Adicionar Titular Autoral | PASS com divergencias | 12 | 9 | 0 | 3 |
| qa_task_02 | HU-02 Visualizar Soma dos Percentuais | PASS | 5 | 5 | 0 | 0 |
| qa_task_03 | HU-03 Editar Percentual | PASS com divergencia | 6 | 4 | 0 | 2 |
| qa_task_04 | HU-04 Remover Titular Autoral | PASS | 4 | 4 | 0 | 0 |
| qa_task_05 | HU-05 Depuracao ao Alterar Titulares LIBERADA | **FAIL** | 14 | 12 | 1 | 1 |

**Total: 4/5 tasks PASS | 1 FAIL | 0 BLOCKED**
**Cenarios: 41 total | 34 PASS | 1 FAIL | 6 DIVERGENCIA**

---

## Funcionalidades Aprovadas

### HU-01 — Adicionar Titular Autoral
- POST /obras/{id}/titularidades funciona para PF como AUTOR (201)
- POST /obras/{id}/titularidades funciona para PJ como EDITOR (201)
- Rejeita PF como EDITOR com mensagem correta (422, "A categoria Editor exige titular Pessoa Jurídica")
- Rejeita duplicata titular+categoria com mensagem correta (409)
- Aceita acumulo de papeis: mesmo titular como AUTOR e EDITOR (RF-05)
- Percentual com 4 casas decimais preservado (33.3333 -> 33.3333)
- Autocomplete GET /titulares/busca?q=... por nome funciona
- Validacao de percentual: 0 e negativo rejeitados, >100 rejeitado

### HU-02 — Visualizar Soma dos Percentuais
- GET /obras/{id}/titularidades retorna lista completa com somaPercentual e somaCompleta
- Obra sem titularidades: somaPercentual=0, somaCompleta=false
- Obra com soma < 100: somaCompleta=false
- Obra com soma = 100: somaCompleta=true
- Estrutura dos campos completa: nome, tipo (PF/PJ), documentoFormatado, categoria, percentual

### HU-03 — Editar Percentual
- PUT /obras/{id}/titularidades/{tid} com novo percentual: 200 + soma recalculada
- Percentual invalido rejeitado
- Titularidade inexistente: 404
- Percentual atualizado confirmado no banco

### HU-04 — Remover Titular Autoral
- DELETE /obras/{id}/titularidades/{tid}: 200 com body completo (lista + soma)
- Titularidade inexistente: 404
- Remocao de todas as titularidades: soma=0, lista vazia
- Remocao confirmada no banco (0 registros)
- DELETE obra com titularidades: 409 (protecao FK)
- DELETE titular com titularidades: 409 (protecao FK)

### HU-05 — Depuracao (cenarios parcialmente aprovados)
- POST/PUT/DELETE em obra LIBERADA: 409 com code=DEPURACAO_NECESSARIA (todos os 3 metodos)
- POST /obras/{id}/depurar: 201, obra original -> DEPURADA, nova obra -> PENDENTE sem ISWC
- ISWC preservado na obra depurada (confirmado)
- POST/PUT/DELETE em obra DEPURADA: 422 "Obras depuradas nao podem ser alteradas" (todos os 3 metodos)
- obraDepuradaParaId corretamente configurado (confirmado no banco)

---

## Falhas Encontradas

### FAIL-01 — RF-23: Titularidades nao copiadas para nova obra na depuracao

**Severidade:** Alta
**Task:** qa_task_05
**Requisito violado:** RF-23 — "as titularidades da obra original são copiadas para a nova obra com as alterações aplicadas"

**Evidencia API:**
```
POST /obras/d17d2745-.../depurar
{titulo: "Meu Bem Querer QA Editado", tipo: "LITEROMUSICAL", subtitulo: "Versao Acustica", genero: "Samba"}

GET /obras/687e71d3-.../titularidades
Response: {"titularidades": [], "somaPercentual": 0, "somaCompleta": false}
```

**Evidencia Banco:**
```sql
SELECT COUNT(*) FROM cadastro.titularidades_autorais WHERE "ObraId" = '687e71d3-...'
-- Resultado: 0 (esperado: ao menos 1 — copia de Gomes Silva Tasso, AUTOR, 100%)
```

**Impacto no usuario:** O Analista precisa re-adicionar manualmente todas as titularidades apos cada depuracao. Fluxo de trabalho prejudicado, pois a depuracao e disparada automaticamente para qualquer alteracao em obra LIBERADA.

**Localizacao provavel:** `DepurarObraCommandHandler` em `services/cadastro-api/2-Application/Cadastro.Application/Obras/Commands/DepurarObraCommand.cs` — nao inclui copia das titularidades ao criar nova obra.

---

## Divergencias (nao-falhas)

### DIV-01 — Categoria "COMPOSITOR" nao reconhecida

**Severidade:** Informativa
**Descricao:** O PRD menciona "Autor/Compositor" como rotulo UI, mas a API aceita apenas "AUTOR" e "EDITOR". POST com categoria "COMPOSITOR" retorna 400.
**Analise:** O PRD usa "Autor/Compositor" como descricao textual (nao dois valores distintos). A implementacao com AUTOR e EDITOR esta alinhada com as regras de negocio. Clareza do PRD pode ser melhorada.

### DIV-02 — HTTP 400 em vez de 422 para validacao de percentual

**Severidade:** Baixa
**Descricao:** POST/PUT com percentual invalido (0, negativo, >100) retornam HTTP 400 (Bad Request) em vez de HTTP 422 (Unprocessable Entity) como especificado.
**Impacto:** Consumidores da API que verificam codigo HTTP exato podem ser afetados. A mensagem e semantica sao corretas.
**Ocorrencias:** C9, C10 (qa_task_01), T3-2a, T3-2b, T3-2c (qa_task_03)

### DIV-03 — Busca de titular por documento formatado nao funciona

**Severidade:** Media
**Descricao:** GET /titulares/busca?q=JG.WD9 (parte de CNPJ formatado) retornou lista vazia. Busca por nome funciona corretamente.
**RF-02:** "pesquisa parcial, case-insensitive, nos campos nome e documento (CPF/CNPJ)"
**Nao testado:** Busca por digitos sem formatacao (ex: apenas numeros do CNPJ).

---

## Cobertura de Requisitos

| Requisito | Descricao | Status |
|-----------|-----------|--------|
| RF-01 | Adicionar titularidade (busca + categoria + percentual) | PASS |
| RF-02 | Autocomplete por nome | PASS (por documento pendente confirmacao) |
| RF-03 | Editor exige PJ (RN-11) | PASS |
| RF-04 | Percentual decimal 4 casas | PASS |
| RF-05 | Acumulo de papeis (mesmo titular, categorias diferentes) | PASS |
| RF-06 | Duplicata titular+categoria rejeitada | PASS |
| RF-07 | Soma exibida apos cada operacao | PASS |
| RF-08 | Soma < 100 aceita (obra PENDENTE) | PASS |
| RF-10 | somaCompleta=false quando soma != 100% | PASS |
| RF-12 | Editar percentual | PASS |
| RF-13 | Categoria nao alteravel via PUT | PASS |
| RF-14 | Soma recalculada apos edicao | PASS |
| RF-15 | Remover titularidade | PASS |
| RF-16 | Soma recalculada apos remocao | PASS |
| RF-17 | Soma 0% quando sem titularidades | PASS |
| RF-18 | Lista com nome, tipo, documento, categoria, percentual | PASS |
| RF-19 | Soma total no response | PASS |
| RF-21 | Depuracao obrigatoria ao alterar titulares de LIBERADA | PASS |
| RF-23 | Titularidades copiadas para nova obra | **FAIL** |

---

## Ambiente Validado

- API Cadastro rodando em http://localhost:5001
- Autenticacao Keycloak funcionando (token obtido com sucesso)
- Banco PostgreSQL acessivel em db.tasso.dev.br:5432
- Schema cadastro: tabela titularidades_autorais com constraints corretas
- Constraint UNIQUE (ObraId, TitularId, Categoria) operacional
- Check constraint Percentual > 0 AND <= 100 operacional
- Check constraint Categoria IN ('AUTOR', 'EDITOR') operacional
- FK RESTRICT para obras_musicais e titulares operacional

---

## Evidencias

- qa_task_01: `/qa-evidence/qa_task_01_adicionar-titularidade/qa_report_task_01.md`
- qa_task_02: `/qa-evidence/qa_task_02_listar-e-soma/qa_report_task_02.md`
- qa_task_03: `/qa-evidence/qa_task_03_editar-percentual/qa_report_task_03.md`
- qa_task_04: `/qa-evidence/qa_task_04_remover-titularidade/qa_report_task_04.md`
- qa_task_05: `/qa-evidence/qa_task_05_depuracao-titulares/qa_report_task_05.md`
