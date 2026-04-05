# Simulador de Carga — Robô de Cadastro

Ferramenta de geração de volume para o domínio Cadastro do mini-ECAD.
Simula 20 usuários virtuais operando em paralelo, gerando obras, fonogramas e titulares
até atingir ~1 milhão de registros (~16 dias de execução contínua).

## Pré-requisitos

- Docker e Docker Compose instalados
- `cadastro-api` rodando (default: `localhost:5001`)

## Como Rodar

### Via docker-compose

```bash
cd services/load-test
docker-compose up -d

# Acompanhar logs
docker logs -f simulador
```

### Via docker run

```bash
# Build da imagem
docker build -t mcad-simulador .

# Execução
docker run --rm --network host \
  -e API_BASE_URL=http://localhost:5001/api/v1 \
  -e VUS=20 \
  -e DURATION=16d \
  mcad-simulador
```

### Execução curta para validação (5 minutos, 1 VU)

```bash
docker run --rm --network host \
  -e API_BASE_URL=http://localhost:5001/api/v1 \
  -e VUS=1 \
  -e DURATION=5m \
  mcad-simulador
```

## Variáveis de Ambiente

| Variável          | Default                                  | Descrição                              |
|-------------------|------------------------------------------|----------------------------------------|
| `API_BASE_URL`    | `http://host.docker.internal:5001/api/v1` | URL base da cadastro-api               |
| `VUS`             | `20`                                     | Número de virtual users simultâneos    |
| `DURATION`        | `16d`                                    | Duração total da execução              |
| `PACE_MULTIPLIER` | `1`                                      | Multiplicador de ritmo (5 = 5x mais rápido) |

## Cenários

| # | Nome              | Peso | Descrição |
|---|-------------------|------|-----------|
| A | Ciclo Completo    | 60%  | Titular → Obra → Titularidades → ISWC → Fonograma → Participações → Calcular → Liberar |
| B | Obra sem Fonograma| 15%  | Obra → Titularidades → ISWC (fonograma criado em ciclo futuro) |
| C | Edição            | 10%  | Edita titular, obra ou fonograma existente |
| D | Depuração         | 10%  | Depura obra ou fonograma LIBERADO |
| E | Bloqueio          | 5%   | Bloqueia entidade → delay → desbloqueia |

## Métricas

No final da execução, o k6 exibe:

- `obras_criadas` — total de obras criadas
- `fonogramas_criados` — total de fonogramas criados
- `titulares_criados` — total de titulares criados
- `depuracoes` — total de depurações executadas
- `bloqueios` — total de bloqueios executados
- `http_req_failed` — taxa de erros (threshold: < 5%)
- `http_req_duration{p(95)}` — latência p95 (threshold: < 2s)

## Projeção de Volume

| Métrica                | Valor      |
|------------------------|------------|
| Delay entre calls      | 2-3s       |
| Ciclo completo         | ~42s       |
| Ciclos/usuário/hora    | ~85        |
| Entidades/usuário/hora | ~128       |
| 20 usuários/dia        | ~61.000    |
| Tempo para 1M          | ~16 dias   |
