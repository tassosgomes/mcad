# Plano de Testes — HU-02: Obter ISWC via API

**Task ID:** qa_task_04
**Tipos:** API | Banco | UI

## Casos de Teste

### CT-01: POST /api/v1/obras/{id}/iswc em obra PENDENTE sem titulares autorais
- **Pre-condicao:** Obra com status PENDENTE e sem titularidades autorais vinculadas
- **Passos:**
  1. Criar obra nova via POST /api/v1/obras-musicais
  2. Chamar POST /api/v1/obras/{id}/iswc sem vincular titulares
- **Expected:** HTTP 422 com mensagem de erro indicando falta de titular autoral
- **Tipo:** API

### CT-02: Verificar pre-condicao de titularidades autorais no banco
- **Pre-condicao:** Acesso ao banco PostgreSQL, schema cadastro
- **Passos:**
  1. Consultar tabela cadastro.titularidades_autorais
  2. Verificar se ha titularidades vinculadas a obras existentes
- **Expected:** Determinar se feature F04 (Titularidades Autorais) esta disponivel para testes
- **Tipo:** Banco

### CT-03: POST /api/v1/obras/{id}/iswc em obra PENDENTE com titulares (se disponivel)
- **Pre-condicao:** Obra com status PENDENTE e ao menos 1 titular autoral vinculado
- **Passos:**
  1. Identificar ou criar obra com titular autoral
  2. Chamar POST /api/v1/obras/{id}/iswc
- **Expected:** HTTP 200 com ISWC preenchido na obra retornada
- **Tipo:** API

### CT-04: Verificar persistencia do ISWC no banco
- **Pre-condicao:** CT-03 executado com sucesso (obra com ISWC obtido)
- **Passos:**
  1. Consultar cadastro.obras_musicais WHERE id = {obra_id}
  2. Verificar campo iswc preenchido
- **Expected:** Campo iswc nao nulo e com valor retornado pela API externa
- **Tipo:** Banco

### CT-05: POST /api/v1/obras/{id}/iswc em obra que ja possui ISWC (duplicata)
- **Pre-condicao:** Obra ja com ISWC atribuido (resultado do CT-03)
- **Passos:**
  1. Chamar POST /api/v1/obras/{id}/iswc na mesma obra que ja tem ISWC
- **Expected:** Erro de negocio — obra ja possui ISWC ou ISWC ja existe no sistema
- **Tipo:** API

### CT-06: UI — Verificar presenca do botao "Obter ISWC" na tela de detalhe
- **Pre-condicao:** Obra com status PENDENTE existente; usuario autenticado como analista
- **Passos:**
  1. Navegar para tela de detalhe/edicao da obra com status PENDENTE
  2. Verificar presenca do botao "Obter ISWC"
- **Expected:** Botao "Obter ISWC" visivel na tela
- **Tipo:** UI

### CT-07: POST /api/v1/obras/{id}/iswc em obra com status diferente de PENDENTE (negativo)
- **Pre-condicao:** Obra com status DEPURADA ou DOMINIO_PUBLICO existente
- **Passos:**
  1. Chamar POST /api/v1/obras/{id}/iswc em obra nao-PENDENTE
- **Expected:** Erro de negocio — operacao nao permitida para este status
- **Tipo:** API
