# Plano de Testes — HU-03: Listar e Filtrar Titulares

**Task ID:** qa_task_03
**Tipos:** API

---

## Dados de Setup (titulares a criar antes dos testes)

| # | Nome | Tipo | Documento | Associacao | Status |
|---|------|------|-----------|------------|--------|
| T1 | Djavan Caetano | PF | CPF 529.982.247-25 | ABRAMUS (a1b2c3d4-e5f6-7890-abcd-ef1234567890) | ATIVO |
| T2 | Djonga Silva | PF | CPF 871.119.670-49 | AMAR (b2c3d4e5-f6a7-8901-bcde-f12345678901) | ATIVO |
| T3 | Ana Carolina Souza | PF | CPF 303.785.820-13 | ABRAMUS (a1b2c3d4-e5f6-7890-abcd-ef1234567890) | ATIVO |
| T4 | Editora Som Ltda | PJ | CNPJ 11.222.333/0001-81 | ASSIM (c3d4e5f6-a7b8-9012-cdef-123456789012) | ATIVO |

---

## Casos de Teste

### CT-01: Listagem default (sem parâmetros)
- **Pré-condição:** Ao menos 4 titulares cadastrados
- **Passos:** GET /api/v1/titulares
- **Expected:** HTTP 200, pagination.size=20, pagination contém page/size/total/totalPages, data ordenado por nome ASC
- **Tipo:** API

### CT-02: Paginação — page e size
- **Pré-condição:** Ao menos 3 titulares cadastrados
- **Passos:** GET /api/v1/titulares?page=1&size=2
- **Expected:** HTTP 200, data.length <= 2, pagination.size=2
- **Tipo:** API

### CT-03: Paginação — segunda página
- **Pré-condição:** Ao menos 3 titulares cadastrados
- **Passos:** GET /api/v1/titulares?page=2&size=2
- **Expected:** HTTP 200, data diferente da page 1 (nomes distintos)
- **Tipo:** API

### CT-04: Ordenação por nome DESC
- **Pré-condição:** Ao menos 2 titulares cadastrados
- **Passos:** GET /api/v1/titulares?sort=-nome
- **Expected:** HTTP 200, data[0].nome > data[last].nome (ordem lexicográfica)
- **Tipo:** API

### CT-05: Filtro por nome parcial case-insensitive
- **Pré-condição:** Djavan Caetano e Djonga Silva cadastrados
- **Passos:** GET /api/v1/titulares?nome=dj
- **Expected:** HTTP 200, todos os resultados contêm "dj" (case-insensitive) no nome
- **Tipo:** API

### CT-06: Filtro por documento parcial
- **Pré-condição:** Djavan Caetano com CPF 529.982.247-25 cadastrado
- **Passos:** GET /api/v1/titulares?documento=52998
- **Expected:** HTTP 200, retorna o titular com CPF iniciado em 52998
- **Tipo:** API

### CT-07: Filtro por associacaoId
- **Pré-condição:** T1 (ABRAMUS) e T3 (ABRAMUS) cadastrados
- **Passos:** GET /api/v1/titulares?associacaoId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
- **Expected:** HTTP 200, todos os resultados têm associacao.sigla="ABRAMUS"
- **Tipo:** API

### CT-08: Filtro por status ATIVO
- **Pré-condição:** Titulares ATIVO cadastrados
- **Passos:** GET /api/v1/titulares?status=ATIVO
- **Expected:** HTTP 200, todos os resultados têm status="ATIVO"
- **Tipo:** API

### CT-09: Combinação de filtros nome + status
- **Pré-condição:** Djavan e Djonga com status ATIVO cadastrados
- **Passos:** GET /api/v1/titulares?nome=dj&status=ATIVO
- **Expected:** HTTP 200, todos os resultados contêm "dj" no nome e têm status="ATIVO"
- **Tipo:** API

### CT-10: Filtro sem resultados
- **Pré-condição:** Nenhum titular com nome "XYZNONEXISTENT"
- **Passos:** GET /api/v1/titulares?nome=XYZNONEXISTENT
- **Expected:** HTTP 200, data=[], pagination.total=0
- **Tipo:** API

### CT-11: Campos do response (RF-19)
- **Pré-condição:** Ao menos 1 titular cadastrado
- **Passos:** GET /api/v1/titulares (verificar campos de cada item)
- **Expected:** Cada item contém: nome, tipo, documento, documentoFormatado, associacao (com sigla), status
- **Tipo:** API

### CT-12: Ordenação por status
- **Pré-condição:** Ao menos 1 titular cadastrado
- **Passos:** GET /api/v1/titulares?sort=status
- **Expected:** HTTP 200 (parâmetro aceito sem erro)
- **Tipo:** API

---

## Cleanup
Excluir todos os titulares criados neste teste (T1, T2, T3, T4) via DELETE /api/v1/titulares/{id}.
