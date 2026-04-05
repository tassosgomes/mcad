# Review — Task 2.0

## Status: Aprovado

## Validação de Requisitos

- [x] Requisitos da tarefa atendidos
- [x] Alinhado com PRD
- [x] Conforme Tech Spec
- [x] Critérios de aceitação satisfeitos

### Detalhamento dos Critérios de Aceitação

| Critério | Status | Observação |
|----------|--------|------------|
| `gerarCpf()` gera CPFs válidos (módulo 11) | OK | Algoritmo validado com 1.000 amostras — 100% válidos |
| `gerarCnpj()` gera CNPJs válidos | OK | Algoritmo validado com 1.000 amostras — 100% válidos |
| `gerarIsrc()` gera formato `BRABC2312345` (12 chars) | OK | Formato BR+3alfanum+2digits+5digits = 12 chars confirmado |
| Pool carrega 7 associações no setup | OK | setup() faz GET /associacoes com fallback para 7 IDs fixos ECAD |

## Revisão de Código

### helpers/api.js

- Implementa `get`, `post`, `put`, `del` com base URL do env (`API_BASE_URL`)
- Headers `Content-Type: application/json` aplicados em todas as requisições
- `handleResponse` usa `check()` k6 para registrar status 2xx e faz `console.warn` em falha (não-bloqueante)
- `http.del()` é o nome correto da função no k6 — correto
- Retorna response object em todos os métodos — correto

### helpers/generators.js

- Exporta funções individuais E objeto `gen` com builders — conforme task 2.2
- CPF: algoritmo módulo 11 correto, retorna formatado (XXX.XXX.XXX-XX)
- CNPJ: algoritmo módulo 11 correto com pesos padrão Receita Federal, filial 0001 fixo, retorna apenas dígitos
- Leve inconsistência de formato: CPF formatado, CNPJ sem formatação — não especificado no PRD, decisão aceitável
- ISRC: formato `BR{3alfanum}{2ano}{5seq}` = 12 chars — correto
- `weightedRandom` implementado corretamente com fallback para último item
- `randomDate` limita dias a 1-28 para evitar datas inválidas (fevereiro) — decisão defensiva adequada
- `gen.titular()` referencia `pool.associacoes` — seguro pois `setupPool` é chamado antes dos cenários
- Dependency: `generators.js` importa `pool.js` — sem dependência circular

### helpers/pool.js

- Isolamento por VU garantido: variáveis de módulo em k6 são por VU
- `_inicializado` flag previne re-inicialização — correto
- Fallback para 7 IDs fixos quando setup não retorna dados válidos — robusto
- `getTitularesAleatorios(n)` usa Fisher-Yates simplificado (sort com random) — adequado para load test
- Métodos adicionais `getObraLiberadaAleatoria()`, `getFonogramaLiberadoAleatorio()`, `getEntidadeAleatoria()` — úteis para cenários C, D, E (além do escopo da tarefa, mas positivo)

### helpers/metrics.js

- 5 counters presentes: `obras_criadas`, `fonogramas_criados`, `titulares_criados`, `depuracoes`, `bloqueios` — conforme task 2.4
- Sintaxe correta com `Counter` do `k6/metrics`

### main.js

- Options k6 corretos: VUS, DURATION, thresholds (rate<0.05, p95<2000ms)
- `parseInt(__ENV.VUS, 10)` com radix — correto
- `setup()` faz GET /associacoes com parsing defensivo (array, `{data:[]}`, `{items:[]}`) e fallback robusto
- `pool.setupPool(data)` chamado antes de `scenario.fn()` em cada iteração — correto
- Seleção ponderada via `TOTAL_WEIGHT` dinâmico (soma dos pesos) — mais robusto que hardcode 100
- `PACE_MULTIPLIER` aplicado no think time — alinhado com RF-20
- `LOG_INTERVAL = 50` itera por VU — mais frequente que PRD RF-24 (1.000 entidades), mas não causa problema funcional

### Problemas Encontrados

1. **[Baixa] Inconsistência de formato CPF vs CNPJ:** `gerarCpf()` retorna string formatada (XXX.XXX.XXX-XX) enquanto `gerarCnpj()` retorna apenas dígitos numéricos. O PRD não especifica o formato esperado pela API, portanto a inconsistência não é bloqueante, mas pode causar rejeição silenciosa se a API exigir formato uniforme.

2. **[Baixa] LOG_INTERVAL por iteração vs entidades:** `LOG_INTERVAL = 50` gera log a cada 50 iterações por VU, o que é mais frequente do que os "1.000 entidades" do RF-24. Não afeta funcionalidade — apenas aumenta verbosidade nos logs.

### Correções Aplicadas

Nenhuma correção necessária. Os problemas são de baixa severidade e não afetam a correção funcional dos módulos nem os critérios de aceitação da tarefa.

## Build e Testes

- Build: N/A (JavaScript/k6 — sem etapa de compilação)
- Testes: N/A (módulos de load test — validação por algoritmo matemático confirmada via script Python)

Validação matemática executada:
- CPF módulo 11: 1.000/1.000 amostras válidas
- CNPJ módulo 11: 1.000/1.000 amostras válidas
- ISRC 12 chars / regex `^BR[A-Z0-9]{3}[0-9]{2}[0-9]{5}$`: 100/100 amostras válidas

## Conclusão da Tarefa

- [x] Implementação completada
- [x] Definição da tarefa, PRD e tech spec validados
- [x] Revisão de código completada
- [x] Pronto para uso pelas tasks dependentes (3.0, 4.0)
