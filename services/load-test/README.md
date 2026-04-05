# Simulador de Carga — Robô de Cadastro

Ferramenta de geração de volume para o domínio Cadastro do mini-ECAD.
Simula 20 usuários virtuais operando em paralelo, gerando obras, fonogramas e titulares
até atingir ~1 milhão de registros (~16 dias de execução contínua).

---

## Pré-requisitos

- Docker e Docker Compose instalados
- `cadastro-api` rodando (default: `localhost:5001`)
- PostgreSQL acessível (para verificação de progresso)

---

## Como Rodar

### Carga completa — produção (20 VUs × 16 dias)

```bash
cd services/load-test
docker-compose up -d
```

Este modo usa as configurações padrão do `docker-compose.yml`: 20 VUs rodando continuamente
por 16 dias até atingir ~1 milhão de registros.

### Carga de validação de concorrência (20 VUs × 1 hora)

Usado para validar que 20 VUs simultâneos não geram deadlocks, unique violations espúrias
ou erros de concorrência.

```bash
cd services/load-test
docker-compose -f docker-compose.yml -f docker-compose.carga.yml up --build
```

Critérios de sucesso do teste de 1 hora:
- Error rate < 5% (`http_req_failed`)
- p95 latência < 2s (`http_req_duration`)
- ~2.500+ entidades criadas (20 VUs × ~128 entidades/VU/hora)
- Zero deadlocks no PostgreSQL

### Validação funcional (1 VU × 5 minutos)

Valida que o ciclo completo funciona antes de rodar a carga real.
Inclui mock do serviço ISWC externo.

```bash
cd services/load-test
./validate.sh
```

### Via docker run

```bash
# Build da imagem
cd services/load-test
docker build -t mcad-simulador .

# Carga real: 20 VUs × 1 hora
docker run --rm \
  -e API_BASE_URL=http://localhost:5001/api/v1 \
  -e VUS=20 \
  -e DURATION=1h \
  mcad-simulador

# Produção: 20 VUs × 16 dias
docker run --rm \
  -e API_BASE_URL=http://localhost:5001/api/v1 \
  -e VUS=20 \
  -e DURATION=16d \
  mcad-simulador
```

---

## Como Parar

```bash
# Parar e remover containers (carga completa)
cd services/load-test
docker-compose down

# Parar e remover containers (carga de concorrência 1h)
docker-compose -f docker-compose.yml -f docker-compose.carga.yml down

# Forçar parada imediata
docker stop simulador
```

---

## Como Verificar Progresso

### Logs em tempo real

```bash
docker logs -f simulador
```

O simulador loga a cada ~50 iterações por VU:

```
[VU 3] iteracao=50 | cenario=cicloCompleto | titulares=47 | obras=43 | fonogramas=38
```

### Contagem no banco de dados

```sql
-- Total de obras musicais criadas
SELECT count(*) FROM cadastro.obras_musicais;

-- Total de fonogramas criados
SELECT count(*) FROM cadastro.fonogramas;

-- Total de titulares criados
SELECT count(*) FROM cadastro.titulares;

-- Distribuição por status da obra
SELECT status, count(*)
FROM cadastro.obras_musicais
GROUP BY status
ORDER BY status;

-- Verificar ausência de Codigo duplicado (deve retornar 0)
SELECT codigo, count(*)
FROM cadastro.obras_musicais
WHERE codigo IS NOT NULL
GROUP BY codigo
HAVING count(*) > 1;

-- Verificar deadlocks no log do PostgreSQL
-- (execute no servidor PostgreSQL ou via pg_stat_activity)
SELECT count(*), wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY wait_event_type, wait_event
ORDER BY count DESC;
```

Shortcut com psql direto:

```bash
psql -h localhost -U postgres -d mcad \
  -c "SELECT count(*) AS obras FROM cadastro.obras_musicais;" \
  -c "SELECT count(*) AS fonogramas FROM cadastro.fonogramas;" \
  -c "SELECT count(*) AS titulares FROM cadastro.titulares;"
```

---

## Variáveis de Ambiente

| Variável           | Default                              | Descrição                                                       |
|--------------------|--------------------------------------|-----------------------------------------------------------------|
| `API_BASE_URL`     | `http://localhost:5001/api/v1`       | URL base da cadastro-api                                        |
| `VUS`              | `20`                                 | Número de virtual users simultâneos                             |
| `DURATION`         | `16d`                                | Duração total da execução (ex: `5m`, `1h`, `16d`)              |
| `PACE_MULTIPLIER`  | `1`                                  | Divisor dos delays: `1` = ritmo real, `5` = 5x mais rápido     |
| `KEYCLOAK_URL`     | *(vazio — sem auth)*                 | Token endpoint do Keycloak (ex: `http://localhost:8080/realms/mcad/...`) |
| `KEYCLOAK_CLIENT_ID` | `mcad-frontend`                   | Client ID do Keycloak                                           |
| `KEYCLOAK_USERNAME` | `analista.teste`                    | Usuário para obter token                                        |
| `KEYCLOAK_PASSWORD` | `Analista123!`                      | Senha do usuário                                                |

---

## Cenários

| # | Nome               | Peso | Descrição |
|---|-------------------|------|-----------|
| A | Ciclo Completo     | 60%  | Titular → Obra → Titularidades → ISWC → Fonograma → Participações → Calcular → URL Áudio → Liberar |
| B | Obra sem Fonograma | 15%  | Obra → Titularidades → ISWC (fonograma criado em ciclo futuro) |
| C | Edição             | 10%  | Edita titular, obra ou fonograma existente |
| D | Depuração          | 10%  | Depura obra ou fonograma LIBERADO (gera nova entidade) |
| E | Bloqueio           | 5%   | Bloqueia entidade → delay → desbloqueia |

---

## Métricas

No final da execução, o k6 exibe o summary com:

### Métricas HTTP padrão

| Métrica                  | Threshold | Descrição                          |
|--------------------------|-----------|------------------------------------|
| `http_req_failed`        | < 5%      | Taxa de erros HTTP                 |
| `http_req_duration p(95)` | < 2000ms | Latência no percentil 95           |

### Contadores customizados

| Métrica               | Descrição                                       |
|-----------------------|-------------------------------------------------|
| `obras_criadas`       | Total de obras musicais criadas com sucesso     |
| `fonogramas_criados`  | Total de fonogramas criados com sucesso         |
| `titulares_criados`   | Total de titulares criados com sucesso          |
| `depuracoes`          | Total de depurações executadas                  |
| `bloqueios`           | Total de bloqueios executados                   |

---

## Projeção de Volume

### Base de cálculo (ritmo real, PACE_MULTIPLIER=1)

| Métrica                    | Valor       |
|----------------------------|-------------|
| Delay entre API calls      | 2-3s        |
| Ciclo completo (Cenário A) | ~42s        |
| Ciclos/usuário/hora        | ~85         |
| Entidades/usuário/hora     | ~128        |

### Projeção por número de VUs

| VUs | Entidades/hora | Entidades/dia | Tempo para 1M   |
|-----|---------------|---------------|-----------------|
| 1   | ~128          | ~3.100        | ~323 dias       |
| 5   | ~640          | ~15.400       | ~65 dias        |
| 10  | ~1.280        | ~30.700       | ~33 dias        |
| 20  | ~2.560        | ~61.000       | **~16 dias**    |

### Teste de concorrência (20 VUs × 1 hora)

| Métrica                   | Estimativa  |
|---------------------------|-------------|
| Obras criadas             | ~1.700      |
| Fonogramas criados        | ~850        |
| Titulares criados         | ~500 (pool) |
| Total entidades           | ~2.500+     |
| Error rate esperado       | < 5%        |
| p95 latência esperada     | < 2s        |

---

## Estrutura de Arquivos

```
services/load-test/
├── Dockerfile                    # FROM grafana/k6
├── docker-compose.yml            # Carga completa: 20 VUs × 16 dias
├── docker-compose.carga.yml      # Carga de concorrência: 20 VUs × 1 hora
├── docker-compose.validation.yml # Validação funcional: 1 VU × 5 minutos
├── validate.sh                   # Script de validação funcional completo
├── mock-iswc/                    # Mock do serviço ISWC externo
│   ├── Dockerfile
│   └── server.js
├── scripts/
│   ├── main.js                   # Entry point: options, setup, seleção ponderada
│   ├── scenarios/
│   │   ├── cicloCompleto.js      # Cenário A (60%)
│   │   ├── obraSemFonograma.js   # Cenário B (15%)
│   │   ├── edicao.js             # Cenário C (10%)
│   │   ├── depuracao.js          # Cenário D (10%)
│   │   └── bloqueio.js           # Cenário E (5%)
│   ├── helpers/
│   │   ├── api.js                # HTTP client com check e logging
│   │   ├── generators.js         # CPF, CNPJ, nomes, títulos, ISRC válidos
│   │   ├── pool.js               # Pool de entidades por VU
│   │   └── metrics.js            # Counters customizados k6
│   └── data/
│       ├── nomes.json            # ~200 nomes + ~200 sobrenomes brasileiros
│       ├── titulos.json          # Adjetivos + substantivos para títulos de obras
│       └── generos.json          # 10 gêneros musicais
└── README.md
```

---

## Troubleshooting

### Unique violations em Codigo ou ISRC

Se o banco reportar registros duplicados, verifique:

```sql
-- ISRCs duplicados (deve retornar 0 linhas)
SELECT isrc, count(*)
FROM cadastro.fonogramas
WHERE isrc IS NOT NULL
GROUP BY isrc
HAVING count(*) > 1;
```

O simulador usa ISRCs gerados aleatoriamente com um componente sequencial de 5 dígitos
e um prefixo de 3 caracteres aleatórios, reduzindo a probabilidade de colisão para
valores insignificantes em 1M de registros.

### Deadlocks no PostgreSQL

Para verificar deadlocks nos logs do PostgreSQL:

```bash
# Via Docker (se PostgreSQL rodar em container)
docker logs mcad-postgres 2>&1 | grep -i deadlock

# Via arquivo de log
grep -i deadlock /var/log/postgresql/postgresql-*.log
```

Se deadlocks ocorrerem frequentemente, considere adicionar retry com backoff nos
endpoints críticos da API.

### Error rate > 5%

1. Verifique se a `cadastro-api` está saudável: `curl http://localhost:5001/health`
2. Reduza o número de VUs temporariamente: `VUS=5`
3. Verifique os logs do simulador: `docker logs -f simulador`
4. Verifique os logs da API para identificar endpoints com falha
