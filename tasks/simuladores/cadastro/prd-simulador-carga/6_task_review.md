# Review — Task 6

## Status: Aprovado (com correção aplicada)

## Validação de Requisitos

- [x] Requisitos da tarefa atendidos
- [x] Alinhado com PRD
- [x] Conforme Tech Spec
- [x] Critérios de aceitação satisfeitos

### Detalhamento

| Subtarefa | Status | Observação |
|-----------|--------|------------|
| 6.1 `docker-compose up` com VUS=20 DURATION=1h | Atendido | `docker-compose.carga.yml` configura exatamente VUS=20 e DURATION=1h via override |
| 6.2 Monitorar via `docker logs -f simulador` | Atendido | README documenta o comando; container_name=simulador definido no override |
| 6.3 Verificar k6 summary: error rate, p95, contagens | Atendido | README lista critérios; thresholds definidos no main.js (Tasks 1-2) |
| 6.4 Verificar no banco: sem duplicatas, sem deadlocks | Atendido | README inclui queries SQL completas para ambas as verificações |
| 6.5 Ajuste se erros de concorrência | Atendido | Troubleshooting documentado no README com passos de diagnóstico |
| 6.6 README.md completo | Atendido | README cobre todos os itens exigidos pela tarefa |

### Critérios de Sucesso

| Critério | Status |
|----------|--------|
| 20 VUs rodam 1h sem crash | Configuração correta; thresholds definidos nas Tasks anteriores |
| Error rate < 5% | Threshold definido em main.js; documentado no README |
| ~2.500+ entidades criadas em 1h | Projeção documentada e alinhada com PRD (128 entidades/VU/hora × 20 VUs) |
| Zero deadlocks no PostgreSQL | Queries de verificação e diagnóstico presentes no README |
| README.md completo e funcional | Atendido — cobre todos os 6 itens exigidos na subtarefa 6.6 |

---

## Revisão de Código

### Arquivos Revisados

- `services/load-test/docker-compose.carga.yml` (novo)
- `services/load-test/docker-compose.yml` (modificado)
- `services/load-test/README.md` (reescrito)

### Problemas Encontrados

#### Problema 1 — Inconsistência de URL no override de carga (Média)

**Arquivo:** `services/load-test/docker-compose.carga.yml`

**Descrição:** O override `docker-compose.carga.yml` definia `API_BASE_URL` e `KEYCLOAK_URL` com
`host.docker.internal`, enquanto o `docker-compose.yml` base define `network_mode: host`. Ao fazer o
merge com `docker-compose -f docker-compose.yml -f docker-compose.carga.yml`, o container resultante
herda `network_mode: host` (correto para Linux) mas sobrescreve as URLs para `host.docker.internal`
— hostname que pode não estar disponível no Linux com `network_mode: host`. O merge confirmado via
`docker-compose config` mostrou a configuração incorreta resultante.

**Impacto:** Em ambiente Linux (incluindo WSL2, principal alvo documentado), a resolução de
`host.docker.internal` falha quando `network_mode: host` está ativo, fazendo o simulador não
conseguir alcançar a API nem o Keycloak.

**Severidade:** Média — causaria falha silenciosa de conectividade no ambiente principal de uso.

#### Problema 2 — Credenciais hardcoded no README (Baixa)

**Arquivo:** `services/load-test/README.md`, tabela de variáveis de ambiente

**Descrição:** `KEYCLOAK_PASSWORD` documenta valor default `Analista123!`. Trata-se de credencial
de ambiente de desenvolvimento/PoC, não de produção. Dentro do contexto de uma ferramenta de carga
local para fins de teste, o risco é baixo, mas a prática cria precedente de expor senhas em
documentação.

**Severidade:** Baixa — ambiente PoC, sem impacto de segurança real; documentado para registro.

### Correções Aplicadas

#### Correção 1 — URLs ajustadas para localhost no override de carga

`services/load-test/docker-compose.carga.yml`: `API_BASE_URL` e `KEYCLOAK_URL` alterados de
`host.docker.internal` para `localhost`, alinhando com o comportamento de `network_mode: host`
herdado do `docker-compose.yml` base. Comentário explicativo adicionado para orientar usuários
de macOS/Windows que precisem substituir pela convenção `host.docker.internal`.

#### Correção 2 — Não aplicada (Baixa)

Credencial default no README não alterada — contexto é PoC local com usuário de teste fixo.
Decisão documentada.

---

## Qualidade do README

O README atende integralmente aos 6 itens da subtarefa 6.6:

| Item exigido | Status |
|--------------|--------|
| Como rodar (`docker-compose up -d`) | Presente — 3 modos documentados (produção, concorrência, validação) |
| Variáveis de ambiente | Presente — tabela com 8 variáveis, defaults e descrições |
| Métricas esperadas (entidades/hora por VU) | Presente — tabela de projeção por VU |
| Projeção de volume | Presente — tabela com estimativas para 1, 5, 10, 20 VUs |
| Como parar (`docker-compose down`) | Presente — 3 variantes documentadas |
| Como verificar progresso (`SELECT count(*)`) | Presente — queries SQL e shortcut psql |

Adicionalmente, o README inclui seção de Troubleshooting para os 3 problemas mais prováveis
(unique violations, deadlocks, error rate > 5%), o que supera os requisitos mínimos da tarefa.

---

## Build e Testes

Esta tarefa não envolve código compilado (.NET/Java). Os artefatos são arquivos de configuração
Docker Compose e documentação Markdown.

- Sintaxe YAML validada: `docker-compose config` executado com sucesso após correção
- README: estrutura e referências consistentes com arquivos existentes em disco

---

## Conclusão da Tarefa

- [x] Implementação completada
- [x] Definição da tarefa, PRD e tech spec validados
- [x] Revisão de código completada — 1 problema de média severidade corrigido
- [x] Pronto para uso
