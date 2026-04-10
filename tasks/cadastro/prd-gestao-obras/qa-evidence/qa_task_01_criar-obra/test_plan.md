# Plano de Testes — HU-01: Criar obra musical

**Task ID:** qa_task_01
**Tipos:** API | Banco | UI

## Casos de Teste

### CT-01: Criar obra com campos mínimos obrigatórios (título + tipo)
- **Pré-condição:** Analista autenticado com token válido
- **Passos:**
  1. POST /api/v1/obras com body {"titulo": "Meu Bem Querer", "tipo": "LITEROMUSICAL"}
- **Expected:** HTTP 201; body com id (uuid), status="PENDENTE", iswc=null, dominioPublico=false, titulo="Meu Bem Querer", tipo="LITEROMUSICAL"
- **Tipo:** API

### CT-02: Criar obra com todos os campos (título + tipo + subtítulo + gênero)
- **Pré-condição:** Analista autenticado com token válido
- **Passos:**
  1. POST /api/v1/obras com body {"titulo": "Garota de Ipanema", "tipo": "MUSICAL", "subtitulo": "The Girl from Ipanema", "genero": "Bossa Nova"}
- **Expected:** HTTP 201; body com todos os campos preenchidos, status="PENDENTE", iswc=null
- **Tipo:** API

### CT-03: Criar obra sem título (campo obrigatório ausente)
- **Pré-condição:** Analista autenticado com token válido
- **Passos:**
  1. POST /api/v1/obras com body {"tipo": "MUSICAL"}
- **Expected:** HTTP 400; erro de validação indicando que título é obrigatório
- **Tipo:** API

### CT-04: Criar obra sem tipo (campo obrigatório ausente)
- **Pré-condição:** Analista autenticado com token válido
- **Passos:**
  1. POST /api/v1/obras com body {"titulo": "Obra Sem Tipo"}
- **Expected:** HTTP 400; erro de validação indicando que tipo é obrigatório
- **Tipo:** API

### CT-05: Criar obra com tipo inválido (valor fora do enum)
- **Pré-condição:** Analista autenticado com token válido
- **Passos:**
  1. POST /api/v1/obras com body {"titulo": "Obra Tipo Invalido", "tipo": "INVALIDO"}
- **Expected:** HTTP 400; erro de validação indicando tipo inválido
- **Tipo:** API

### CT-06: Consultar obra criada por ID
- **Pré-condição:** Obra criada no CT-01 com ID conhecido
- **Passos:**
  1. GET /api/v1/obras/{id} com o ID retornado no CT-01
- **Expected:** HTTP 200; body idêntico ao retornado na criação (status=PENDENTE, iswc=null)
- **Tipo:** API

### CT-07: Validar persistência no banco de dados
- **Pré-condição:** Obra criada no CT-01 com ID conhecido
- **Passos:**
  1. SELECT * FROM cadastro.obras_musicais WHERE "Id" = '{id}'
- **Expected:** Registro encontrado; "Status"='PENDENTE', "Iswc"=NULL, "DominioPublico"=false, "Titulo"='Meu Bem Querer', "Tipo"='LITEROMUSICAL'
- **Tipo:** Banco

### CT-08: UI — Criar obra via formulário no frontend
- **Pré-condição:** Usuário analista logado no frontend (http://localhost:5173)
- **Passos:**
  1. Navegar para /cadastro/obras/novo
  2. Preencher título "Obra Via Interface"
  3. Selecionar tipo "MUSICAL"
  4. Clicar em Salvar
- **Expected:** Redirecionamento para página de detalhe ou listagem; obra aparece na listagem com status PENDENTE
- **Tipo:** UI
