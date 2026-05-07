# Plano de Testes — Depuração Automática de Obras LIBERADAS

**Task ID:** qa_task_05
**Tipos:** API | Banco | UI

## Obras disponíveis para teste

- "Garota de Ipanema" (id: 9f5729f0-0cfc-41dd-9af5-0c90c77623c9) — Status: LIBERADO, ISWC: T-721428352-3
- "Obra de Teste Depurar" (id: c49adc4e-2aa1-4386-8ee4-121c91e3b901) — Status: LIBERADO, ISWC: T-334367645-6

Obra usada nos CTs: "Garota de Ipanema" (9f5729f0...)

## Casos de Teste

### CT-01: PUT em obra LIBERADA alterando título retorna 409 DEPURACAO_NECESSARIA (RF-06)
- **Pré-condição:** Obra "Garota de Ipanema" com status LIBERADO
- **Passos:**
  1. PUT /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9 com body contendo título diferente
- **Expected:** HTTP 409, body com code "DEPURACAO_NECESSARIA"
- **Tipo:** API

### CT-02: PUT em obra LIBERADA alterando apenas gênero retorna 200 (RF-10)
- **Pré-condição:** Obra LIBERADA existe e não foi depurada ainda
- **Passos:**
  1. GET /api/v1/obras/9f5729f0... para obter dados atuais
  2. PUT /api/v1/obras/9f5729f0... com mesmo título + gênero alterado
- **Expected:** HTTP 200 — sem disparo de depuração
- **Tipo:** API

### CT-03: POST /depurar cria nova obra PENDENTE e depura original (RF-07)
- **Pré-condição:** Obra LIBERADA sem depuração
- **Passos:**
  1. POST /api/v1/obras/9f5729f0.../depurar com body { "titulo": "Garota de Ipanema (Remasterizada)", "tipo": "MUSICAL", "subtitulo": null, "genero": null }
- **Expected:** HTTP 201, body com "obraDepurada" (status DEPURADA) e "novaObra" (status PENDENTE, iswc null)
- **Tipo:** API

### CT-04: Banco — obra original com status DEPURADA e ObraDepuradaParaId preenchido (RF-07, RF-08)
- **Pré-condição:** CT-03 executado com sucesso
- **Passos:**
  1. SELECT da obra original no banco
- **Expected:** Status=DEPURADA, Iswc=T-721428352-3 (mantido), ObraDepuradaParaId = ID da nova obra
- **Tipo:** Banco

### CT-05: Banco — nova obra com status PENDENTE, ISWC null, título atualizado (RF-09)
- **Pré-condição:** CT-03 executado com sucesso
- **Passos:**
  1. SELECT da nova obra pelo ID retornado no CT-03
- **Expected:** Status=PENDENTE, Iswc=null, Titulo="Garota de Ipanema (Remasterizada)"
- **Tipo:** Banco

### CT-06: PUT em obra DEPURADA retorna 422 (imutável) (RF-08)
- **Pré-condição:** Obra original está DEPURADA (após CT-03)
- **Passos:**
  1. PUT /api/v1/obras/9f5729f0... com qualquer campo alterado
- **Expected:** HTTP 422 (imutável)
- **Tipo:** API

### CT-07: GET obra DEPURADA — campo obraDepuradaParaId preenchido (RF-07)
- **Pré-condição:** Obra está DEPURADA
- **Passos:**
  1. GET /api/v1/obras/9f5729f0...
- **Expected:** campo obraDepuradaParaId preenchido com ID da nova obra
- **Tipo:** API

### CT-08: UI — modal de depuração e banner "Esta obra foi depurada" (RF-06, RF-07)
- **Pré-condição:** Obra DEPURADA visível no frontend
- **Passos:**
  1. Navegar até detalhe da obra original depurada no frontend
- **Expected:** Banner "Esta obra foi depurada" visível; campo obraDepuradaParaId ou link para nova obra presente
- **Tipo:** UI
