# Plano de Testes — HU-04: Editar dados da obra

**Task ID:** qa_task_03
**Tipos:** API | Banco | UI

## Casos de Teste

### CT-01: Editar titulo de obra PENDENTE — happy path
- **Pre-condicao:** Obra com status PENDENTE existe (criada via POST)
- **Passos:**
  1. POST /api/v1/obras para criar obra PENDENTE
  2. PUT /api/v1/obras/{id} com novo titulo "Meu Bem Querer"
- **Expected:** HTTP 200, titulo atualizado no corpo da resposta, status permanece PENDENTE
- **Tipo:** API

### CT-02: Editar tipo de obra PENDENTE
- **Pre-condicao:** Obra PENDENTE criada no CT-01
- **Passos:** PUT /api/v1/obras/{id} alterando campo tipo
- **Expected:** HTTP 200, tipo atualizado na resposta
- **Tipo:** API

### CT-03: Editar genero de obra PENDENTE
- **Pre-condicao:** Obra PENDENTE criada no CT-01
- **Passos:** PUT /api/v1/obras/{id} alterando campo genero
- **Expected:** HTTP 200, genero atualizado na resposta
- **Tipo:** API

### CT-04: Editar subtitulo de obra PENDENTE
- **Pre-condicao:** Obra PENDENTE criada no CT-01
- **Passos:** PUT /api/v1/obras/{id} alterando campo subtitulo
- **Expected:** HTTP 200, subtitulo atualizado na resposta
- **Tipo:** API

### CT-05: Validacao de banco — obra atualizada persiste corretamente
- **Pre-condicao:** CT-01 a CT-04 executados com sucesso
- **Passos:** SELECT na tabela cadastro.obras_musicais pelo id da obra
- **Expected:** Registro com titulo, tipo, genero e subtitulo atualizados
- **Tipo:** Banco

### CT-06: PUT em obra com titulo vazio — caso negativo
- **Pre-condicao:** Obra PENDENTE criada no CT-01
- **Passos:** PUT /api/v1/obras/{id} com titulo ""
- **Expected:** HTTP 400 ou 422 (validacao: titulo nao pode ser vazio)
- **Tipo:** API

### CT-07: PUT em obra LIBERADA alterando titulo — deve retornar 409 DEPURACAO_NECESSARIA
- **Pre-condicao:** Obra com status LIBERADO existe no banco (com ISWC)
- **Passos:** PUT /api/v1/obras/{id_liberada} com titulo diferente
- **Expected:** HTTP 409, body com code "DEPURACAO_NECESSARIA"
- **Tipo:** API
- **Observacao:** Se nao houver obra LIBERADA disponivel, documentar como pre-condicao nao atendida

### CT-08: PUT em obra LIBERADA alterando apenas genero/tipo/subtitulo — deve permitir
- **Pre-condicao:** Obra com status LIBERADO existe no banco
- **Passos:** PUT /api/v1/obras/{id_liberada} com mesmo titulo, genero diferente
- **Expected:** HTTP 200, obra atualizada
- **Tipo:** API
- **Observacao:** Se nao houver obra LIBERADA disponivel, documentar como pre-condicao nao atendida

### CT-09: UI — Navegar para pagina de edicao e salvar alteracao
- **Pre-condicao:** Obra PENDENTE existe, frontend acessivel em http://localhost:5173
- **Passos:**
  1. Navegar para /cadastro/obras/{id}
  2. Editar campo titulo
  3. Salvar
- **Expected:** Atualizacao refletida na UI sem erros
- **Tipo:** UI
