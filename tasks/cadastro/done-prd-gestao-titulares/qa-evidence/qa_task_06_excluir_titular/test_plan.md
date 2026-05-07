# Plano de Testes — RF-23/RF-24: Excluir Titular

**Task ID:** qa_task_06
**Data/Hora:** 2026-04-08T00:00:00Z
**Tipos:** API | UI | Banco

---

## Contexto

- RF-23: Impedir exclusão de titular com vínculos a obra ou fonograma (409 Conflict)
- RF-24: Permitir exclusão permanente se titular não possuir vínculos (204 No Content)
- Contrato: DELETE /api/v1/titulares/{id}

---

## Setup de Dados

- Titular A (PF): CPF 54869115301 — criado para exclusão bem-sucedida (sem vínculos)
- Titular B (PJ): CNPJ 11444777000161 — criado para teste de permissão (consultor)
- AssociacaoId: a1b2c3d4-e5f6-7890-abcd-ef1234567890

---

## Casos de Teste

### CT-01: Excluir titular sem vínculos (RF-24) — Happy Path
- **Pré-condição:** Titular A criado com sucesso, sem vínculos
- **Passos:**
  1. DELETE /api/v1/titulares/{id_titular_A} com token analista
- **Expected:** HTTP 204 No Content, sem body
- **Tipo:** API

### CT-02: Confirmar exclusão via GET após DELETE
- **Pré-condição:** CT-01 passou (Titular A excluído)
- **Passos:**
  1. GET /api/v1/titulares/{id_titular_A} com token analista
- **Expected:** HTTP 404 Not Found
- **Tipo:** API

### CT-03: Excluir titular inexistente
- **Pré-condição:** Nenhuma
- **Passos:**
  1. DELETE /api/v1/titulares/00000000-0000-0000-0000-000000000001 com token analista
- **Expected:** HTTP 404 Not Found
- **Tipo:** API

### CT-04: Excluir titular com vínculos (RF-23)
- **Pré-condição:** Titular com vínculos a obras ou fonogramas (F04/F05/F06)
- **Passos:**
  1. Verificar se existem tabelas de vínculo no banco
  2. Se existirem, inserir vínculo via SQL e tentar DELETE
- **Expected:** HTTP 409 Conflict com body {"detail": "Titular não pode ser excluído pois possui vínculos..."}
- **Tipo:** API + Banco
- **NOTA:** Se F04/F05/F06 não estiverem implementadas, marcar como NÃO TESTÁVEL

### CT-05: Consultor não pode excluir (permissão)
- **Pré-condição:** Titular B criado com sucesso
- **Passos:**
  1. Obter token consultor
  2. DELETE /api/v1/titulares/{id_titular_B} com token consultor
- **Expected:** HTTP 403 Forbidden
- **Tipo:** API

### UI-13: Excluir titular via interface
- **Pré-condição:** Titular criado via API, analista logado
- **Passos:**
  1. Login como analista.teste no Playwright
  2. Navegar para Cadastro > Titulares
  3. Localizar titular na listagem
  4. Clicar botão excluir (lixeira)
  5. Confirmar no modal/dialog
  6. Verificar que desapareceu da listagem
- **Expected:** Titular removido da listagem, sem erros
- **Tipo:** UI
- **Screenshots:** 01_listagem_antes.png, 02_confirmar_exclusao.png, 03_apos_exclusao.png

### UI-14: Consultor sem botão excluir
- **Pré-condição:** Consultor logado
- **Passos:**
  1. Login como consultor.teste no Playwright
  2. Navegar para Cadastro > Titulares
  3. Verificar ausência de botão excluir
- **Expected:** Sem botão/ícone de excluir visível
- **Tipo:** UI
- **Screenshot:** 04_consultor_sem_excluir.png
