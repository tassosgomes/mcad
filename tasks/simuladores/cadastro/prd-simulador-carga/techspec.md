# Tech Spec — Simulador de Carga (k6)

> **PRD:** `tasks/prd-simulador-carga/prd.md`
> **Data:** 2026-04-05

---

## Resumo Executivo

Simulador em **k6** (JavaScript/TypeScript) executando em container Docker. Implementa 5 cenários de uso ponderados, pool de titulares reutilizáveis, geração de dados brasileiros válidos (CPF, CNPJ, nomes, títulos), e métricas customizadas de progresso. Estrutura modular: helpers de geração, cenários isolados, e orquestrador principal.

## Arquitetura

```
services/load-test/
├── Dockerfile                    ← FROM grafana/k6
├── docker-compose.yml            ← Standalone com env vars
├── scripts/
│   ├── main.js                   ← Entry point: setup + cenários ponderados
│   ├── scenarios/
│   │   ├── cicloCompleto.js      ← Cenário A (60%)
│   │   ├── obraSemFonograma.js   ← Cenário B (15%)
│   │   ├── edicao.js             ← Cenário C (10%)
│   │   ├── depuracao.js          ← Cenário D (10%)
│   │   └── bloqueio.js           ← Cenário E (5%)
│   ├── helpers/
│   │   ├── api.js                ← HTTP client wrappers (POST, GET, PUT, DELETE)
│   │   ├── generators.js         ← CPF, CNPJ, nomes, títulos, ISRC
│   │   ├── pool.js               ← Pool de titulares/obras/fonogramas reutilizáveis
│   │   └── metrics.js            ← Counters customizados k6
│   └── data/
│       ├── nomes.json            ← Lista de nomes brasileiros (~200 nomes + ~200 sobrenomes)
│       ├── titulos.json          ← Palavras para gerar títulos de obras
│       └── generos.json          ← 10 gêneros musicais
└── README.md
```

## Design de Implementação

### Entry Point (main.js)

```javascript
import { sleep, check } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { cicloCompleto } from './scenarios/cicloCompleto.js';
import { obraSemFonograma } from './scenarios/obraSemFonograma.js';
import { edicao } from './scenarios/edicao.js';
import { depuracao } from './scenarios/depuracao.js';
import { bloqueio } from './scenarios/bloqueio.js';

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
  duration: __ENV.DURATION || '16d',
  thresholds: {
    http_req_failed: ['rate<0.05'],    // < 5% erros
    http_req_duration: ['p(95)<2000'],  // p95 < 2s
  },
};

const scenarios = [
  { weight: 60, fn: cicloCompleto },
  { weight: 15, fn: obraSemFonograma },
  { weight: 10, fn: edicao },
  { weight: 10, fn: depuracao },
  { weight: 5,  fn: bloqueio },
];

export default function () {
  // Seleção ponderada
  const roll = Math.random() * 100;
  let acc = 0;
  for (const s of scenarios) {
    acc += s.weight;
    if (roll < acc) {
      s.fn();
      break;
    }
  }
  // Think time entre cenários
  sleep(randomIntBetween(5, 10));
}
```

### Cenário A — Ciclo Completo

```javascript
// scenarios/cicloCompleto.js
import { api } from '../helpers/api.js';
import { gen } from '../helpers/generators.js';
import { pool } from '../helpers/pool.js';
import { metrics } from '../helpers/metrics.js';
import { sleep } from 'k6';

export function cicloCompleto() {
  const pace = () => sleep(randomBetween(2, 3));

  // 1. Titular (reutiliza do pool ou cria novo se pool < 500)
  let titular;
  if (pool.titulares.length < 500) {
    const data = gen.titular();
    const res = api.post('/titulares', data);
    titular = JSON.parse(res.body);
    pool.titulares.push(titular);
    metrics.titularesCriados.add(1);
    pace();
  } else {
    titular = randomItem(pool.titulares);
  }

  // 2. Criar obra
  const obraData = gen.obra();
  const obraRes = api.post('/obras', obraData);
  const obra = JSON.parse(obraRes.body);
  metrics.obrasCriadas.add(1);
  pace();

  // 3. Titularidades (2-3)
  const numTitularidades = randomIntBetween(2, 3);
  const titulares = pool.getTitularesAleatorios(numTitularidades);
  let percentualRestante = 100;
  for (let i = 0; i < titulares.length; i++) {
    const pct = i === titulares.length - 1
      ? percentualRestante
      : randomBetween(20, 60);
    percentualRestante -= pct;

    api.post(`/obras/${obra.id}/titularidades`, {
      titularId: titulares[i].id,
      categoria: titulares[i].tipo === 'PJ' ? 'EDITOR' : 'AUTOR',
      percentual: Math.round(pct * 10000) / 10000,
    });
    pace();
  }

  // 4. ISWC
  api.post(`/obras/${obra.id}/iswc`, {});
  pace();

  // 5. Fonograma
  const fonoData = gen.fonograma(obra.id);
  const fonoRes = api.post('/fonogramas', fonoData);
  const fono = JSON.parse(fonoRes.body);
  metrics.fonogramasCriados.add(1);
  pace();

  // 6. Participações (3-4)
  const numParticipacoes = randomIntBetween(3, 4);
  const categorias = ['INTERPRETE', 'PRODUTOR_FONOGRAFICO', 'MUSICO_EXECUTANTE'];
  for (let i = 0; i < numParticipacoes; i++) {
    const cat = i === 0 ? 'INTERPRETE' : i === 1 ? 'PRODUTOR_FONOGRAFICO' : 'MUSICO_EXECUTANTE';
    api.post(`/fonogramas/${fono.id}/participacoes`, {
      titularId: randomItem(pool.titulares).id,
      categoria: cat,
    });
    pace();
  }

  // 7. Calcular
  api.post(`/fonogramas/${fono.id}/participacoes/calcular`, {});
  pace();

  // 8. URL áudio
  api.put(`/fonogramas/${fono.id}`, {
    ...fonoData,
    urlAudio: `https://storage.ecad.org.br/audio/${fono.isrc}.mp3`,
  });
  pace();

  // 9. Liberar obra
  api.post(`/obras/${obra.id}/liberar`, {});
  pace();

  // 10. Liberar fonograma
  api.post(`/fonogramas/${fono.id}/liberar`, {});

  pool.obras.push(obra);
  pool.fonogramas.push(fono);
}
```

### Geradores de Dados (helpers/generators.js)

```javascript
import nomes from '../data/nomes.json';
import titulos from '../data/titulos.json';
import generos from '../data/generos.json';

export const gen = {
  titular() {
    const isPJ = Math.random() < 0.2;
    return {
      nome: isPJ ? `Editora ${randomItem(nomes.sobrenomes)} Music Ltda` : `${randomItem(nomes.nomes)} ${randomItem(nomes.sobrenomes)}`,
      tipo: isPJ ? 'PJ' : 'PF',
      documento: isPJ ? gerarCnpj() : gerarCpf(),
      nacionalidade: 'Brasileira',
      associacaoId: randomItem(pool.associacoes).id,
    };
  },

  obra() {
    const tipos = [
      { tipo: 'LITEROMUSICAL', weight: 70 },
      { tipo: 'MUSICAL', weight: 20 },
      { tipo: 'VERSAO', weight: 5 },
      { tipo: 'POT_POURRI', weight: 5 },
    ];
    return {
      titulo: `${randomItem(titulos.adjetivos)} ${randomItem(titulos.substantivos)}`,
      tipo: weightedRandom(tipos),
      genero: randomItem(generos),
    };
  },

  fonograma(obraId) {
    return {
      isrc: gerarIsrc(),
      obraId,
      paisOrigem: 'Brasil',
      dataGravacao: randomDate(2020, 2026),
      dataLancamento: randomDate(2020, 2026),
    };
  },
};

function gerarCpf() { /* módulo 11 */ }
function gerarCnpj() { /* módulo 11 numérico */ }
function gerarIsrc() {
  const reg = randomChars(3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const ano = randomIntBetween(20, 26).toString().padStart(2, '0');
  const num = randomIntBetween(10000, 99999).toString();
  return `BR${reg}${ano}${num}`;
}
```

### Pool de Entidades (helpers/pool.js)

```javascript
// SharedArray para compartilhar entre VUs (read-only after setup)
// Para dados mutáveis, usar __ENV ou variáveis locais por VU
import { SharedArray } from 'k6/data';

export const pool = {
  associacoes: [],  // carregado no setup()
  titulares: [],    // cresce durante execução (local por VU)
  obras: [],        // idem
  fonogramas: [],   // idem

  getTitularesAleatorios(n) {
    const shuffled = [...this.titulares].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, shuffled.length));
  },
};
```

### Métricas Customizadas (helpers/metrics.js)

```javascript
import { Counter } from 'k6/metrics';

export const metrics = {
  obrasCriadas: new Counter('obras_criadas'),
  fonogramasCriados: new Counter('fonogramas_criados'),
  titularesCriados: new Counter('titulares_criados'),
  depuracoes: new Counter('depuracoes'),
  bloqueios: new Counter('bloqueios'),
};
```

### Dockerfile

```dockerfile
FROM grafana/k6:latest

WORKDIR /scripts
COPY scripts/ .

ENTRYPOINT ["k6", "run", "/scripts/main.js"]
```

### docker-compose.yml

```yaml
services:
  simulador:
    build: .
    environment:
      - API_BASE_URL=http://host.docker.internal:5001/api/v1
      - VUS=20
      - DURATION=16d
      - PACE_MULTIPLIER=1
    network_mode: host  # para acessar localhost:5001
    restart: unless-stopped
```

### Execução

```bash
# Via docker-compose
cd services/load-test
docker-compose up -d

# Ou via docker run
docker run --rm --network host \
  -e API_BASE_URL=http://localhost:5001/api/v1 \
  -e VUS=20 \
  -e DURATION=16d \
  mcad-simulador

# Acompanhar progresso
docker logs -f simulador
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/load-test/Dockerfile` | Docker | FROM grafana/k6, COPY scripts |
| `services/load-test/docker-compose.yml` | Docker | Config com env vars |
| `services/load-test/scripts/main.js` | Entry point | Options, cenários ponderados, orquestrador |
| `services/load-test/scripts/scenarios/cicloCompleto.js` | Cenário | Fluxo completo: titular→obra→titularidades→ISWC→fono→conexos→liberar |
| `services/load-test/scripts/scenarios/obraSemFonograma.js` | Cenário | Obra + titularidades + ISWC (sem fonograma) |
| `services/load-test/scripts/scenarios/edicao.js` | Cenário | Editar titular/obra/fonograma existente |
| `services/load-test/scripts/scenarios/depuracao.js` | Cenário | Depurar obra ou fonograma LIBERADO |
| `services/load-test/scripts/scenarios/bloqueio.js` | Cenário | Bloquear → delay → desbloquear |
| `services/load-test/scripts/helpers/api.js` | Helper | HTTP client wrappers com base URL + checks |
| `services/load-test/scripts/helpers/generators.js` | Helper | CPF, CNPJ, nomes, títulos, ISRC válidos |
| `services/load-test/scripts/helpers/pool.js` | Helper | Pool de entidades reutilizáveis por VU |
| `services/load-test/scripts/helpers/metrics.js` | Helper | Counters k6 customizados |
| `services/load-test/scripts/data/nomes.json` | Data | ~200 nomes + ~200 sobrenomes brasileiros |
| `services/load-test/scripts/data/titulos.json` | Data | Adjetivos + substantivos para títulos de obras |
| `services/load-test/scripts/data/generos.json` | Data | 10 gêneros musicais |
| `services/load-test/README.md` | Doc | Como rodar, configuração, métricas |

---

## Testes de Validação

| Cenário | Verificação |
|---------|-------------|
| `docker-compose up` | Container inicia sem erros |
| 1 VU, 5 minutos | Ciclo completo funciona (obra + fono criados) |
| 20 VUs, 1 hora | Sem erros de concorrência (unique violations, deadlocks) |
| Métricas | Counters incrementam corretamente |
| Progresso | Log a cada 1000 entidades |

---

*Tech Spec gerada.*
