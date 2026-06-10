# Plano de Testes — qa_task_01: Criar Licença

## User Story
HU-01: Como Analista de Arrecadação, quero criar uma licença vinculando um Usuário de Música a uma Rubrica com vigência definida, para formalizar o contrato de licenciamento.

## Casos de Teste

### CT-01: Happy Path — Criar licença válida
- **Pré-condição:** Existe pelo menos um Usuário de Música ATIVO e uma Rubrica cadastrada
- **Passos:**
  1. Autenticar e obter token
  2. GET /api/arrecadacao/v1/usuarios-musica?status=ATIVO&page=1&size=1
  3. GET /api/arrecadacao/v1/rubricas?page=1&size=1
  4. POST /api/arrecadacao/v1/licencas com dados válidos
- **Expected:** HTTP 201, status="ATIVA", usuarioMusica e rubrica expandidos
- **Tipo:** API

### CT-02: Validação — Usuário INATIVO
- **Pré-condição:** Existe um Usuário de Música INATIVO
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas com usuarioMusicaId INATIVO
- **Expected:** HTTP 422, detail contém "INATIVO"
- **Tipo:** API

### CT-03: Validação — dataInicio no passado
- **Pré-condição:** Nenhuma
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas com dataInicio = ontem
- **Expected:** HTTP 422, detail contém "dataInicio não pode ser anterior"
- **Tipo:** API

### CT-04: Validação — dataFim antes de dataInicio
- **Pré-condição:** Nenhuma
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas com dataInicio = amanhã, dataFim = hoje
- **Expected:** HTTP 422, detail contém "dataFim deve ser posterior a dataInicio"
- **Tipo:** API

### CT-05: Múltiplas licenças para mesmo par (RF-02)
- **Pré-condição:** CT-01 executado com sucesso
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas com mesmo usuarioMusicaId + rubricaId do CT-01
- **Expected:** HTTP 201 (deve permitir — sem restrição de unicidade)
- **Tipo:** API

### CT-06: Frontend — Abrir formulário de criação
- **Pré-condição:** Usuário autenticado
- **Passos:**
  1. Navegar para /arrecadacao/licencas
  2. Clicar em "Nova Licença"
- **Expected:** Modal/form abre com campos Usuário de Música, Rubrica, Data Início, Data Fim
- **Tipo:** UI

### CT-07: Frontend — Submeter criação válida
- **Pré-condição:** CT-06 executado com sucesso
- **Passos:**
  1. Preencher formulário com dados válidos
  2. Submeter
- **Expected:** Mensagem de sucesso ou nova licença aparece na lista com status "Ativa"
- **Tipo:** UI

## Dados de Teste
- Data atual: 2026-06-09
- dataInicio válida: 2026-06-09
- dataInicio inválida (passado): 2026-06-08
- dataInicio futura: 2026-06-10
- dataFim inválida: 2026-06-09 (menor que dataInicio futura)
