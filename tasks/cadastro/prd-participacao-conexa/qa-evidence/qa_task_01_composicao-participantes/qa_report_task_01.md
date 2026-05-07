# QA Report — qa_task_01: Composição de Participantes

**Data de execução:** 2026-04-11
**User Story:** HU-01 — Composição de participantes em fonograma
**Tipo:** API + DB
**Status final:** PASS

---

## Ambiente

- Base URL: http://localhost:5001/api/v1
- Fonograma criado para teste: `ff6075db-450e-4054-9832-0f7d21f42ae7` (ISRC: BRQA02600001, status: PENDENTE_VALIDACAO)
- Titular T1 (INTERPRETE/MUSICO): `48882c43-ed41-44a0-a195-ef7964f2974d` — Tasso Silva Gomes
- Titular T2 (PRODUTOR): `de9f6d12-a4c8-4489-800f-cfa330afac6f` — Gomes Silva Tasso

---

## Cenários Executados

### Cenário 1 — Pré-condição: Criar fonograma PENDENTE_VALIDACAO
- **Ação:** POST /api/v1/fonogramas com ISRC=BRQA02600001
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **Resultado:** PASS
- **Observação:** Status retornado foi PENDENTE_VALIDACAO (não PENDENTE)

### Cenário 2 — Listar titulares disponíveis
- **Ação:** GET /api/v1/titulares?pageSize=10
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Total titulares:** 10
- **Resultado:** PASS

### Cenário 3 — POST add T1 como INTERPRETE (RF-01)
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com {titularId: T1, categoria: "INTERPRETE"}
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **Percentual na resposta:** null (correto)
- **Editavel:** true (correto)
- **somaPercentual:** null (correto)
- **somaCalculada:** false (correto)
- **Resultado:** PASS

### Cenário 4 — POST add T1 como MUSICO_EXECUTANTE (RF-02: acúmulo mesmo titular, categoria diferente)
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com {titularId: T1, categoria: "MUSICO_EXECUTANTE"}
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **Percentual na resposta:** null (correto)
- **Editavel do músico:** false (correto — músico não é editável)
- **Resultado:** PASS

### Cenário 5 — POST add T1 como INTERPRETE novamente (RF-03: 409 duplicata)
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com {titularId: T1, categoria: "INTERPRETE"}
- **HTTP esperado:** 409
- **HTTP obtido:** 409
- **Mensagem:** "Este titular já está vinculado com esta categoria neste fonograma"
- **Resultado:** PASS

### Cenário 6 — POST add T2 como PRODUTOR_FONOGRAFICO
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com {titularId: T2, categoria: "PRODUTOR_FONOGRAFICO"}
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **Percentual na resposta:** null (correto)
- **Editavel:** true (correto)
- **Resultado:** PASS

### Cenário 7 — GET /participacoes verificar todos percentuais null
- **Ação:** GET /api/v1/fonogramas/{id}/participacoes
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Total participações:** 3 (INTERPRETE, MUSICO_EXECUTANTE, PRODUTOR_FONOGRAFICO)
- **Todos percentuais null:** true (correto)
- **somaCalculada:** false (correto)
- **somaPercentual:** null (correto)
- **percentuaisDesatualizados:** false (correto)
- **Resultado:** PASS

### Cenário 8 — DELETE remove MUSICO_EXECUTANTE (dc4c5ba0)
- **Ação:** DELETE /api/v1/fonogramas/{id}/participacoes/dc4c5ba0-a676-4bfd-9719-6e5d8f099b9a
- **HTTP esperado:** 200 com body
- **HTTP obtido:** 200
- **Lista atualizada:** 2 participações (PRODUTOR_FONOGRAFICO, INTERPRETE)
- **Resultado:** PASS

### Cenário 9 — DB: verificar linhas em cadastro.participacoes_conexas
- **Consulta:** SELECT Id, Nome, Categoria, Percentual FROM cadastro.participacoes_conexas JOIN cadastro.titulares WHERE FonogramaId = '{id}'
- **Resultado esperado:** 2 linhas (INTERPRETE, PRODUTOR_FONOGRAFICO), Percentual NULL
- **Resultado obtido:** 2 linhas (INTERPRETE, PRODUTOR_FONOGRAFICO), Percentual NULL
- **Resultado:** PASS

### Cenário 10 — DB: verificar PercentuaisDesatualizados no fonograma
- **Consulta:** SELECT Id, Status, PercentuaisDesatualizados FROM cadastro.fonogramas WHERE Id = '{id}'
- **Resultado esperado:** PercentuaisDesatualizados = false
- **Resultado obtido:** PercentuaisDesatualizados = f (false)
- **Resultado:** PASS

---

## Resumo

| Cenário | Resultado |
|---------|-----------|
| Criar fonograma PENDENTE_VALIDACAO | PASS |
| Listar titulares | PASS |
| POST INTERPRETE → 201 percentual null | PASS |
| POST mesmo titular categoria diferente (RF-02) → 201 | PASS |
| POST mesmo titular mesma categoria (RF-03) → 409 | PASS |
| POST PRODUTOR_FONOGRAFICO → 201 | PASS |
| GET participacoes todos null | PASS |
| DELETE → 200 com lista atualizada | PASS |
| DB: linhas corretas na tabela | PASS |
| DB: PercentuaisDesatualizados = false | PASS |

**Total: 10/10 PASS**

---

## Observações

- A API retornou status `PENDENTE_VALIDACAO` para fonogramas recém-criados (não `PENDENTE`). Os testes de composição funcionaram normalmente neste status.
- A coluna `Editavel` não existe diretamente na tabela `cadastro.participacoes_conexas` — é calculada pela aplicação com base na `Categoria`.
