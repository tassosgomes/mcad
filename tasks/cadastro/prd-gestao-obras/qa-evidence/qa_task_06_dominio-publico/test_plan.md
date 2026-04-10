# Plano de Testes — HU-05: Marcar obra como Domínio Público

**Task ID:** qa_task_06
**Tipos:** API | Banco | UI

## Casos de Teste

### CT-01: Marcar obra PENDENTE como Domínio Público
- **Pré-condição:** Obra criada com status PENDENTE (sem ISWC)
- **Passos:**
  1. Criar obra via POST /api/v1/obras (sem ISWC)
  2. Verificar que status é PENDENTE
  3. PUT /api/v1/obras/{id}/dominio-publico com { "dominioPublico": true }
- **Expected:** HTTP 200, body com status = "DOMINIO_PUBLICO"
- **Tipo:** API

### CT-02: Desmarcar obra de Domínio Público (retorna a PENDENTE)
- **Pré-condição:** Obra com status DOMINIO_PUBLICO (sem ISWC), criada no CT-01
- **Passos:**
  1. PUT /api/v1/obras/{id}/dominio-publico com { "dominioPublico": false }
- **Expected:** HTTP 200, body com status = "PENDENTE" (obra sem ISWC)
- **Tipo:** API

### CT-03: Validação no banco — campos DominioPublico e Status
- **Pré-condição:** Obra marcada como DP no CT-01
- **Passos:**
  1. Consultar cadastro.obras_musicais WHERE id = {id}
  2. Verificar coluna dominio_publico = true e status = 'DOMINIO_PUBLICO'
- **Expected:** Registro com dominio_publico = true e status = DOMINIO_PUBLICO
- **Tipo:** Banco

### CT-04: Tentar marcar como DP obra DEPURADA
- **Pré-condição:** Existe obra com status DEPURADA no banco
- **Passos:**
  1. Identificar obra DEPURADA via banco
  2. PUT /api/v1/obras/{id}/dominio-publico com { "dominioPublico": true }
- **Expected:** HTTP 4xx (erro — não pode alterar obra DEPURADA)
- **Tipo:** API

### CT-05: UI — Verificar toggle/checkbox de Domínio Público na tela de detalhe
- **Pré-condição:** Usuário autenticado, obra existente
- **Passos:**
  1. Navegar para http://localhost:5173
  2. Fazer login como analista.teste
  3. Navegar para lista de obras
  4. Abrir detalhe/edição de obra PENDENTE
  5. Verificar presença de toggle/checkbox de Domínio Público
- **Expected:** Elemento de toggle/checkbox de Domínio Público visível na tela
- **Tipo:** UI
