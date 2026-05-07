# Plano de Testes — Exclusão de Obras

**Task ID:** qa_task_07
**Tipos:** API | Banco | UI

## Casos de Teste

### CT-01: GET obra com ID inexistente retorna 404
- **Pré-condição:** Nenhuma obra com ID 00000000-0000-0000-0000-000000000000 existe
- **Passos:**
  1. GET /api/v1/obras/00000000-0000-0000-0000-000000000000
- **Expected:** HTTP 404
- **Tipo:** API

### CT-02: DELETE obra com status DEPURADA retorna 409
- **Pré-condição:** Existe obra com status DEPURADA no banco (criada nos testes anteriores)
- **Passos:**
  1. Consultar banco para obter ID de obra DEPURADA
  2. DELETE /api/v1/obras/{id-depurada}
- **Expected:** HTTP 409 com mensagem "Obras depuradas não podem ser excluídas"
- **Tipo:** API | Banco

### CT-03: DELETE obra com titularidades autorais vinculadas retorna 409
- **Pré-condição:** Existe obra com titularidades_autorais vinculadas (de testes anteriores)
- **Passos:**
  1. Consultar banco para obter ID de obra com titularidades
  2. DELETE /api/v1/obras/{id-com-titularidades}
- **Expected:** HTTP 409 com mensagem "Obra não pode ser excluída pois possui titularidades autorais vinculadas"
- **Tipo:** API | Banco

### CT-04: DELETE obra PENDENTE sem vínculos retorna 204
- **Pré-condição:** Nenhuma (obra criada durante o teste)
- **Passos:**
  1. POST /api/v1/obras com dados mínimos (sem titulares)
  2. Verificar criação com status 201
  3. DELETE /api/v1/obras/{id-novo}
- **Expected:** HTTP 204 (exclusão bem-sucedida)
- **Tipo:** API

### CT-05: GET obra excluída retorna 404 (confirmação de exclusão)
- **Pré-condição:** CT-04 executado com sucesso (id da obra excluída disponível)
- **Passos:**
  1. GET /api/v1/obras/{id-excluido} (mesmo id do CT-04)
- **Expected:** HTTP 404
- **Tipo:** API

### CT-06: Banco — obra excluída não existe mais na tabela
- **Pré-condição:** CT-04 executado com sucesso
- **Passos:**
  1. SELECT COUNT(*) FROM cadastro.obras WHERE id = '{id-excluido}'
- **Expected:** Resultado = 0 (sem soft-delete) OU registro com deleted_at preenchido (soft-delete)
- **Tipo:** Banco

### CT-07: UI — modal de confirmação de exclusão e comportamento após excluir
- **Pré-condição:** Frontend acessível, analista autenticado
- **Passos:**
  1. Acessar lista de obras no frontend
  2. Localizar uma obra PENDENTE sem vínculos
  3. Clicar no botão de exclusão
  4. Verificar exibição do modal de confirmação
  5. Confirmar exclusão
  6. Verificar redirecionamento ou remoção da obra da lista
- **Expected:** Modal exibido, exclusão confirmada, obra removida da lista
- **Tipo:** UI
