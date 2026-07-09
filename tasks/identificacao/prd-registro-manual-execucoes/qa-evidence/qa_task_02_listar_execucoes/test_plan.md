# Test Plan: qa_task_02 — Listar execuções da captação (RF-04)

## Story
RF-04 — A tela de detalhe da captação exibe seção "Execuções" com tabela paginada de todas as execuções da captação.

## Test Cases

### TC-01: API — GET /captacoes/{id}/execucoes com ID válido → retorna lista paginada
- **Type:** API
- **Method:** GET
- **URL:** https://mcad-identificacao.tasso.dev.br/api/v1/captacoes/{captacaoId}/execucoes?page=1&size=20
- **Auth:** Bearer JWT
- **Expected:** 200, body com `data[]` e `pagination{}`
- **Validation:** Status 200, body contém campos `data`, `pagination`, estrutura de item com `obraTitulo`, `interpretes`, `inicio`, `fim`, `duracaoSegundos`, `quantidade`, `tipoUtilizacao`, `status`

### TC-02: API — GET /captacoes/{id}/execucoes em captação sem execuções → lista vazia
- **Type:** API
- **Method:** GET
- **URL:** https://mcad-identificacao.tasso.dev.br/api/v1/captacoes/{captacaoIdSemExecucoes}/execucoes
- **Auth:** Bearer JWT
- **Expected:** 200, data[] vazio, pagination.total = 0
- **Validation:** `data` é array vazio, `pagination.total` = 0

### TC-03: API — GET /captacoes/{id}/execucoes com parâmetros de paginação
- **Type:** API
- **Method:** GET
- **URL:** https://mcad-identificacao.tasso.dev.br/api/v1/captacoes/{captacaoId}/execucoes?page=1&size=5&sort=inicio
- **Auth:** Bearer JWT
- **Expected:** 200, pagination.size = 5, no máximo 5 itens em data[]
- **Validation:** `pagination.size` = 5, `data` length ≤ 5

### TC-04: API — GET /captacoes/{id}/execucoes com ID inválido → 404
- **Type:** API
- **Method:** GET
- **URL:** https://mcad-identificacao.tasso.dev.br/api/v1/captacoes/00000000-0000-0000-0000-000000000000/execucoes
- **Auth:** Bearer JWT
- **Expected:** 404
- **Validation:** Status 404

### TC-05: API — GET /captacoes/{id}/execucoes sem autenticação → 401
- **Type:** API
- **Method:** GET
- **URL:** https://mcad-identificacao.tasso.dev.br/api/v1/captacoes/{captacaoId}/execucoes
- **Auth:** None
- **Expected:** 401
- **Validation:** Status 401

### TC-06: UI — Verificar tabela de execuções na tela de detalhe da captação
- **Type:** UI
- **Steps:**
  1. Login via browser com analista_identificacao@mcad.dev
  2. Navegar para lista de captações
  3. Clicar em uma captação com execuções
  4. Verificar seção "Execuções" visível
  5. Verificar colunas: Título, Intérpretes, Início, Fim, Duração, Qtd, Tipo, Status, Ações
  6. Verificar botão "Adicionar Execução" visível (owner + ABERTA)
  7. Verificar ícones de editar/excluir por linha
- **Expected:** Tabela renderizada corretamente, botões de ação visíveis para analista owner em captação ABERTA

### TC-07: UI — Estado vazio quando captação não tem execuções
- **Type:** UI
- **Steps:**
  1. Navegar para captação sem execuções
  2. Verificar mensagem "Nenhuma execução registrada"
- **Expected:** Estado vazio exibido
