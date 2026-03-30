---
description: Orquestrador de Missão Sequencial (PRD + TechSpec + Tasks)
---

# 🚀 Workflow: Orquestrador de Missão Sequencial

Este workflow define o protocolo para o Agente consumir documentação técnica e executar uma série de tarefas de forma atômica, garantindo a integridade do sistema entre cada passo.

---

## 📋 Fase 1: Ancoragem de Contexto e Contratos
Antes de iniciar qualquer alteração de código, o Agente deve:

1. **Ingestão de Requisitos:** Ler o arquivo de visão (`prd.md`) para alinhar os objetivos de negócio.
2. **Definição Técnica:** Analisar a especificação técnica (`techspec.md`) contratos de api (api-contract.md e api-contract.yaml) para extrair:
   - Contratos de API/Interfaces.
   - Padrões de Arquitetura (ex: DDD, Clean Arch).
   - Invariantes de Domínio e Regras de Negócio.
3. **Mapeamento de Workspace:** Identificar quais módulos, serviços ou pastas serão afetados.

---

## 🔄 Fase 2: Ciclo de Execução Iterativo (Task Loop)
Para cada tarefa definida na pasta ou lista de tarefas (ex: `tasks/1_task.md`, `tasks/2_task.md`...):

### 1. Preparação da Task
- Isolar o contexto apenas para a tarefa atual.
- Gerar um **Implementation Plan** detalhando os arquivos que serão criados ou modificados.

### 2. Implementação e Codificação
- Aplicar as mudanças respeitando rigorosamente a `techspec.md` e as `rules/` globais.
- Garantir que qualquer alteração de "contrato" (API, Schemas) seja refletida nos documentos de integração.

### 3. Validação e Self-Healing
- Invocar o **Terminal Agent** para executar builds e testes automatizados.
- Se houver falhas, analisar logs, corrigir o código e re-testar até obter sucesso ("Green").

### 4. Persistência e Checkpoint
- Realizar o commit das alterações com uma mensagem descritiva (ex: `feat(scope): task 01 - descrição`).
- **Bloqueio:** Não iniciar a próxima tarefa se a atual apresentar erros pendentes ou regressões.

---

## ✅ Fase 3: Homologação e Encerramento
Após concluir todas as tarefas da sequência:

1. **Integração Global:** Verificar se a comunicação entre os módulos alterados está funcionando conforme esperado.
2. **Vibe Check Visual:** Se houver interface, validar a fidelidade com o design (Stitch/Figma).
3. **Relatório de QA:** Atualizar o log de execução (`qa_report.md`) resumindo:
   - O que foi implementado.
   - Quais testes foram executados.
   - Observações técnicas para o code review.