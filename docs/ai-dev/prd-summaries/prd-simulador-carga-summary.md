# PRD Summary — Simulador de Carga (Robo de Cadastro)

**PRD:** `tasks/simuladores/cadastro/prd-simulador-carga/prd.md`
**Data de conclusao:** 2026-04-05
**Total de tarefas:** 6

---

## Objetivo

Simulador automatizado que gera dados realistas no dominio Cadastro via k6 em container Docker,
simulando 20 usuarios virtuais em paralelo com ritmo acelerado (5x human pace) para atingir
1 milhao de registros em ~16 dias.

---

## Tarefas Implementadas

| Task | Descricao | Status |
|------|-----------|--------|
| 1.0 | Estrutura base: Dockerfile, docker-compose, main.js (options + orquestrador ponderado) | Concluida |
| 2.0 | Helpers: api.js, generators.js (CPF/CNPJ/nomes/ISRC), pool.js, metrics.js | Concluida |
| 3.0 | Data: nomes.json (~200+200), titulos.json, generos.json | Concluida |
| 4.0 | Cenarios: cicloCompleto (60%), obraSemFonograma (15%), edicao (10%), depuracao (10%), bloqueio (5%) | Concluida |
| 5.0 | Validacao funcional: 1 VU x 5 min, mock ISWC, validate.sh | Concluida |
| 6.0 | Carga de concorrencia: 20 VUs x 1h, docker-compose.carga.yml, README completo | Concluida |

---

## Artefatos Entregues

```
services/load-test/
├── Dockerfile
├── docker-compose.yml              # Carga producao: 20 VUs x 16 dias
├── docker-compose.carga.yml        # Carga concorrencia: 20 VUs x 1 hora
├── docker-compose.validation.yml   # Validacao funcional: 1 VU x 5 minutos
├── validate.sh                     # Script de validacao completo
├── mock-iswc/                      # Mock do servico ISWC externo
│   ├── Dockerfile
│   └── server.py
├── scripts/
│   ├── main.js
│   ├── scenarios/
│   │   ├── cicloCompleto.js
│   │   ├── obraSemFonograma.js
│   │   ├── edicao.js
│   │   ├── depuracao.js
│   │   └── bloqueio.js
│   ├── helpers/
│   │   ├── api.js
│   │   ├── generators.js
│   │   ├── pool.js
│   │   └── metrics.js
│   └── data/
│       ├── nomes.json
│       ├── titulos.json
│       └── generos.json
└── README.md
```

---

## Consolidado de Qualidade

### Total de Problemas por Tarefa

| Task | Criticos | Altos | Medios | Baixos | Total |
|------|----------|-------|--------|--------|-------|
| 1.0  | 0 | 0 | 1 | 2 | 3 |
| 2.0  | 0 | 0 | 0 | 2 | 2 |
| 3.0  | 0 | 0 | 0 | 0 | 0 |
| 4.0  | 0 | 4 | 0 | 0 | 4 |
| 5.0  | 0 | 0 | 0 | 2 | 2 |
| 6.0  | 0 | 0 | 1 | 1 | 2 |
| **Total** | **0** | **4** | **2** | **7** | **13** |

### Categoria Tecnica mais Frequente

Falha de integracao (4 ocorrencias — todas na Task 4, contratos de request incompletos)

### Origem mais Frequente

Lacuna na TechSpec (especialmente contratos de API) e Limitacao do modelo (empate)

### Indicios de Fragilidade Estrutural

- **Task 4:** 4 problemas de alta severidade por contratos de request nao documentados na TechSpec.
  Os exemplos de codigo da TechSpec usavam payloads parciais que nao correspondiam aos contratos
  reais da cadastro-api (campos obrigatorios ausentes).
- **Tasks 1 e 6:** Recorrencia de problemas com network_mode do Docker (host vs host.docker.internal).
  Indica que a configuracao de rede do container nao estava suficientemente especificada.

---

## Licoes Aprendidas

### Para PRDs futuros de ferramentas de carga/simulacao

1. **Contratos de API:** Incluir no PRD ou TechSpec os campos obrigatorios de cada request,
   especialmente para operacoes de atualizacao (PUT). Nao assumir que exemplos parciais sao suficientes.

2. **Plataforma Docker:** Especificar explicitamente o sistema operacional alvo (Linux/WSL2 vs
   macOS/Windows) e os impactos em `network_mode`. Documentar a convencao de URL correspondente
   (`localhost` vs `host.docker.internal`).

3. **Limitacoes do k6:** Documentar que contadores k6 (Counter) nao sao legiveis durante execucao —
   apenas no summary final. Qualquer log de progresso deve usar variaveis locais ao VU.

4. **Validacao de override Docker Compose:** Para tarefas que geram arquivos override, incluir
   instrucao para validar o merge via `docker-compose config`.

### Para a TechSpec

- Incluir tabela de contratos de request (campos obrigatorios vs opcionais) para cada endpoint
  utilizado pelos cenarios de simulacao.
- Especificar o formato de documento esperado pela API (CPF/CNPJ com ou sem mascara).
- Adicionar aviso sobre limitacao de leitura de contadores k6 durante execucao.
