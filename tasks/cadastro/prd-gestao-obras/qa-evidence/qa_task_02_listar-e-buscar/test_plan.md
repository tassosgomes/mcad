# Plano de Testes — HU-03: Buscar obra na listagem

**Task ID:** qa_task_02
**Tipos:** API, UI

## Casos de Teste

### CT-00: Seed — Criar obras para uso nos testes
- **Pre-condicao:** API disponivel, token de analista valido
- **Passos:** POST /api/v1/obras com os 3 titulos definidos no prompt
- **Expected:** HTTP 201 para as 3 obras
- **Tipo:** API (setup)

### CT-01: Listagem sem filtros retorna 200 com estrutura paginada
- **Pre-condicao:** Ao menos 1 obra existente
- **Passos:** GET /api/v1/obras (sem query params)
- **Expected:** HTTP 200, body contendo array `data` e objeto `pagination` com campos page, size, total, totalPages
- **Tipo:** API

### CT-02: Filtro por titulo parcial case-insensitive
- **Pre-condicao:** Obras "Aquarela do Brasil", "Meu Caro Amigo" e outras existindo
- **Passos:** GET /api/v1/obras?titulo=meu
- **Expected:** HTTP 200, retorna apenas obras com "meu" no titulo (case-insensitive), nao retorna "Aquarela do Brasil"
- **Tipo:** API

### CT-03: Filtro por tipo exato
- **Pre-condicao:** Obras de tipo MUSICAL e LITEROMUSICAL existindo
- **Passos:** GET /api/v1/obras?tipo=MUSICAL
- **Expected:** HTTP 200, todos os registros retornados tem tipo=MUSICAL
- **Tipo:** API

### CT-04: Filtro por status exato
- **Pre-condicao:** Obras com status PENDENTE existindo (default apos criacao)
- **Passos:** GET /api/v1/obras?status=PENDENTE
- **Expected:** HTTP 200, todos os registros tem status=PENDENTE
- **Tipo:** API

### CT-05: Filtro por genero parcial
- **Pre-condicao:** Obra "Aquarela do Brasil" com genero=MPB existindo
- **Passos:** GET /api/v1/obras?genero=mpb
- **Expected:** HTTP 200, retorna obras com genero contendo "mpb" (case-insensitive)
- **Tipo:** API

### CT-06: Paginacao com size=1
- **Pre-condicao:** Ao menos 2 obras existentes
- **Passos:** GET /api/v1/obras?page=1&size=1
- **Expected:** HTTP 200, data com exatamente 1 item, pagination.size=1, pagination.total >= 2, pagination.totalPages >= 2
- **Tipo:** API

### CT-07: Ordenacao por titulo ASC
- **Pre-condicao:** Obras com titulos diferentes existindo
- **Passos:** GET /api/v1/obras?sort=titulo
- **Expected:** HTTP 200, data ordenado alphabeticamente ASC por titulo
- **Tipo:** API

### CT-08: Acesso com perfil Consultor (leitura permitida)
- **Pre-condicao:** Token de consultor valido
- **Passos:** GET /api/v1/obras com Authorization: Bearer <token_consultor>
- **Expected:** HTTP 200 — consultor pode ler a listagem
- **Tipo:** API

### CT-09: UI — Listagem em /cadastro/obras exibe filtros visuais
- **Pre-condicao:** Frontend rodando, usuario logado como analista
- **Passos:** Navegar para http://localhost:5173/cadastro/obras
- **Expected:** Pagina carrega com lista de obras e campos de filtro visiveis
- **Tipo:** UI

### CT-10: UI — Consultor nao ve botoes de acao (criar, editar, excluir)
- **Pre-condicao:** Frontend rodando, usuario logado como consultor
- **Passos:** Navegar para http://localhost:5173/cadastro/obras como consultor
- **Expected:** Listagem exibe obras mas botoes "Nova Obra", "Editar" e "Excluir" nao estao visiveis
- **Tipo:** UI
