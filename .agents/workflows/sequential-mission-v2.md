---
description: Orquestrador de Missão Sequencial (PRD + TechSpec + Tasks) v2
---

## 🧭 Fase 0: Resolução de Stack e SKILLs

**Esta fase é executada uma única vez, antes de qualquer outra.**

### 0.1 Identificar a Stack da Task
Ler o arquivo da task atual e identificar:
- Linguagem principal (ex: Java, TypeScript, Python, Go).
- Framework ou runtime (ex: Spring Boot, NestJS, FastAPI, Gin).
- Ferramentas de build e teste (ex: Maven, npm, pytest, go test).

### 0.2 Carregar SKILLs Relevantes
Consultar as SKILLs disponíveis no projeto e ou globalmente e selecionar **todas** as que se aplicam à stack identificada.

Exemplos de mapeamento:

| Stack identificada | SKILLs a carregar |
|---|---|
| Java + Spring Boot | `java-architecture`, `java-code-quality`, `java-testing`, `java-dependency-config`, `java-observability`, `java-performance`, `java-production-readiness` |
| C# + ASP.NET | `dotnet-architecture`, `dotnet-code-quality`, `dotnet-testing`, `dotnet-dependency-config`, `dotnet-observability`, `dotnet-performance`, `dotnet-production-readiness` |
| TypeScript + NestJS | `react-architecture`, `react-code-quality`, `react-testing`, `react-observability`, `react-runtime-config`, `react-production-readiness` |
| Python + FastAPI | SKILLs de estrutura Python, testes, qualidade |
| GO | `golang-pro` |
| Qualquer stack | Sempre carregar SKILLs de qualidade e testes se disponíveis |

> **Regra:** se não houver SKILL específica para a stack, aplicar os princípios gerais de Clean Architecture, separação de camadas e testes automatizados como fallback. Registrar essa decisão no relatório final.

### 0.3 Extrair das SKILLs
De cada SKILL carregada, extrair e registrar localmente para uso nas fases seguintes:
- Estrutura de pastas e camadas esperadas.
- Padrões arquiteturais obrigatórios e proibições explícitas.
- Comandos de build, lint e teste.
- Checklist de qualidade e production readiness.

> A partir daqui, todas as fases usam as regras e comandos extraídos das SKILLs — não valores fixos hardcoded neste workflow.

---

## 📋 Fase 1: Ancoragem de Contexto e Contratos

Antes de iniciar qualquer alteração de código, executar todos os passos abaixo em sequência. **Nenhuma task pode ser iniciada se esta fase apresentar bloqueios.**

### 1.1 Ingestão de Requisitos
- Ler o `prd.md` para alinhar os objetivos de negócio e o escopo da entrega.

### 1.2 Definição Técnica
- Analisar `techspec.md`, `api-contract.md` e `api-contract.yaml` extraindo:
  - Contratos de API e interfaces públicas.
  - Padrões de arquitetura adotados (conforme SKILL carregada na Fase 0).
  - Invariantes de domínio e regras de negócio.
  - Modelos de request/response derivados do contrato OpenAPI (quando aplicável).

### 1.3 Validação de Contrato ⚠️ BLOQUEANTE
Verificar se os endpoints descritos na `techspec.md` são **consistentes** com o `api-contract.yaml`.

Critérios de bloqueio:
- Endpoint presente na techspec mas ausente no yaml (ou vice-versa).
- Payload de request/response divergente entre os dois documentos.
- HTTP method ou path incompatíveis.

> **Se houver divergência:** interromper e reportar ao usuário antes de prosseguir. Não inferir nem reconciliar automaticamente.

### 1.4 Mapeamento de Workspace
Para cada task da sequência, identificar explicitamente:

| Campo | Descrição |
|---|---|
| Camadas afetadas | Conforme estrutura definida na SKILL (ex: domain / application / api / infra) |
| Módulos / pacotes | Conforme convenção da stack identificada |
| Interfaces / ports criados ou alterados | Contratos entre camadas |
| Arquivos novos | Lista com caminho completo esperado |
| Arquivos modificados | Lista com caminho completo e motivo |

### 1.5 Detecção de Conflitos entre Tasks ⚠️ BLOQUEANTE
Antes de iniciar o loop, verificar se alguma task futura viola invariantes estabelecidas por tasks anteriores:

- Uma task altera uma interface que outra task já implementa?
- Uma task modifica um contrato (DTO, schema, evento) que outro componente já consome?
- Uma task muda um schema de banco que outra migração já fixou?

> **Se houver conflito:** documentar a dependência e reordenar as tasks ou reportar ao usuário.

---

## 🔄 Fase 2: Ciclo de Execução Iterativo (Task Loop)

Para cada arquivo de task (`tasks/1_task.md`, `tasks/2_task.md`...):

### 2.1 Preparação da Task

Gerar um **Implementation Plan** com estrutura fixa antes de escrever qualquer código:

```
## Implementation Plan — Task [N]: [Nome]

### Stack ativa
- Linguagem: ...
- Framework: ...
- SKILLs carregadas: ...

### Camadas afetadas
(conforme estrutura da SKILL — ex: domain, application, api, infra)

### Arquivos a criar
- `caminho/completo/Arquivo` — motivo

### Arquivos a modificar
- `caminho/completo/Arquivo` — o que muda e por quê

### Módulos / pacotes impactados
- ...

### Invariantes arquiteturais a respeitar
(extraídas da SKILL carregada — listar explicitamente)
```

### 2.2 Implementação e Codificação
- Aplicar as mudanças respeitando rigorosamente `techspec.md`, as SKILLs carregadas e as `rules/` globais.
- Modelos de request/response devem ser derivados do `api-contract.yaml` — nunca inventados.
- Qualquer alteração de contrato (API, schemas, eventos) deve ser refletida nos documentos de integração antes do commit.

### 2.3 Validação e Self-Healing

Executar na seguinte **ordem estrita** (mais rápido → mais lento), usando os comandos extraídos da SKILL na Fase 0:

#### Etapa A — Compilação / verificação de sintaxe
```
<comando de build da stack — extraído da SKILL>
exemplos: mvn compile | tsc --noEmit | python -m py_compile | go build ./...
```
> Falha aqui → corrigir antes de prosseguir. Não executar testes com código que não compila.

#### Etapa B — Lint e qualidade estática
```
<comando de lint da stack — extraído da SKILL>
exemplos: mvn spotless:check | eslint . | ruff check . | golangci-lint run
```

#### Etapa C — Testes unitários da camada de domínio / core
```
<comando de teste unitário, escopo: domínio — extraído da SKILL>
exemplos: mvn test -pl domain | jest --testPathPattern=domain | pytest tests/unit/domain
```
> São os mais rápidos e os mais importantes. Devem estar verdes antes de qualquer outra coisa.

#### Etapa D — Testes unitários do módulo modificado
```
<comando de teste unitário, escopo: módulo afetado — extraído da SKILL>
```

#### Etapa E — Testes de regressão global
```
<comando de teste completo da stack — extraído da SKILL>
exemplos: mvn test | npm test | pytest | go test ./...
```
> Detecta regressões em módulos não-alvo. Executar ao final de **cada task**, não apenas na Fase 3.

#### Self-Healing
- Analisar o log de falha completo.
- Identificar a causa raiz (compilação, assertion, configuração, dependência).
- Corrigir e reiniciar da **Etapa A**.
- Máximo de **3 ciclos** de auto-correção por etapa. Se não convergir, pausar e reportar ao usuário com o log e a hipótese de causa.

### 2.4 Persistência e Checkpoint
- Realizar o commit das alterações com mensagem no padrão:
  ```
  feat(scope): task 0N - descrição curta da mudança
  ```
- **Bloqueio:** não iniciar a próxima task se a atual apresentar erros pendentes, regressões ou violações arquiteturais detectadas.

---

## ✅ Fase 3: Homologação e Encerramento

Após concluir **todas** as tasks da sequência:

### 3.1 Integração Global
- Executar o build completo do projeto com o comando da stack ativa (extraído da SKILL).
- Verificar se a comunicação entre os módulos alterados está funcionando conforme os contratos definidos na Fase 1.
- Confirmar que os checklists de production readiness da SKILL foram satisfeitos.

### 3.2 Vibe Check Visual *(condicional)*
> **Executar apenas se** alguma task tocou a camada de API ou qualquer interface de usuário.

- Validar fidelidade com o design (Stitch / Figma).
- Verificar responses HTTP e formatos de erro conforme contrato.

### 3.3 Relatório de QA

Atualizar `qa_report.md` seguindo o template fixo abaixo:

```markdown
# QA Report — [Nome da Entrega]
**Data:** YYYY-MM-DD
**Branch:** feature/xxx
**Stack:** linguagem + framework
**SKILLs utilizadas:** lista das SKILLs carregadas na Fase 0
**Fallback aplicado:** sim / não (se sim, descrever)

---

## Tasks Executadas

| # | Task | Status | Camadas Afetadas | Commit |
|---|------|--------|-----------------|--------|
| 1 | Descrição | ✅ / ❌ | ... | abc1234 |

---

## Cobertura de Testes

| Módulo / Camada | Antes | Depois |
|----------------|-------|--------|
| domínio / core | X% | Y% |
| módulo afetado | X% | Y% |

---

## Violações Arquiteturais Encontradas e Corrigidas

- Nenhuma / Descrever com referência à regra da SKILL violada.

---

## Conflitos de Contrato Detectados

- Nenhum / Descrever divergências encontradas entre techspec e api-contract.yaml.

---

## Regressões Detectadas

- Nenhuma / Descrever se algum teste verde anterior ficou vermelho e como foi resolvido.

---

## Observações para Code Review

- Pontos de atenção, decisões de design não óbvias, trade-offs adotados.
```

---

## 🚦 Mapa de Bloqueios e Escalonamento

| Situação | Ação |
|---|---|
| Nenhuma SKILL encontrada para a stack (0.2) | ⚠️ Continuar com fallback — registrar no relatório |
| Contrato OpenAPI diverge da techspec (1.3) | 🛑 Pausar — reportar ao usuário |
| Conflito de invariante entre tasks (1.5) | 🛑 Pausar — reportar ao usuário |
| Falha de compilação após 3 ciclos (2.3-A) | 🛑 Pausar — reportar com log |
| Testes do domínio vermelhos após 3 ciclos (2.3-C) | 🛑 Pausar — reportar com log |
| Regressão em módulo não-alvo (2.3-E) | 🛑 Não avançar — investigar antes |
| Task anterior com erro pendente (2.4) | 🚫 Próxima task bloqueada |
| Build completo falha na Fase 3 | 🛑 Não gerar relatório — corrigir primeiro |