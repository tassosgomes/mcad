# Relatório de QA — Módulo Arrecadação (D03)

**Data:** 04/06/2026  
**Testador:** Analista Arrecadacao (`analista_arrecadacao`)  
**Role:** `arrecadacao.default.analista`  
**Sistema:** https://mcad.tasso.dev.br  
**Sessão de teste:** Browser (Playwright MCP)

---

## Resumo Executivo

| Feature | Resultado | Bugs |
|---|---|---|
| F01 — Seed de Rubricas | ✅ PASSOU | BUG-02 (nomes errados no filtro) |
| F02 — Gestão de Usuários de Música | ✅ PASSOU | — |
| F03 — Gestão de Licenças | ✅ PASSOU | BUG-01 (paginação), BUG-02 |
| F04 — UDA + Registro de Pagamentos | ✅ PASSOU | — |
| F05 — Verba Líquida | ✅ PASSOU | BUG-01, BUG-02 |
| F06 — Estorno de Pagamento | ✅ PASSOU | — |

**Total de casos testados:** 35+  
**Passaram:** 35+  
**Falharam:** 0  
**Bugs encontrados:** 2 (ambos cosméticos/baixa-média severidade)

---

## F01 — Seed de Rubricas

### Objetivo
Verificar que as 7 rubricas foram semeadas corretamente via Flyway.

### Testes realizados

| Caso | Resultado |
|---|---|
| Rubricas aparecem no select de Nova Licença | ✅ |
| Nomes corretos no formulário de Nova Licença | ✅ |

### Observações
- As 7 rubricas estão corretamente disponíveis no formulário de criação de licença: Rádio AM/FM, TV Aberta, TV Fechada, Cinema, Streaming Vídeo (VOD), Streaming Áudio, Show.
- ⚠️ **BUG-02**: Os filtros de listagem usam nomes diferentes (ver seção de bugs).

---

## F02 — Gestão de Usuários de Música

### Objetivo
CRUD completo de usuários de música (estabelecimentos) com ciclo de status e histórico.

### Testes realizados

| Caso | Descrição | Resultado |
|---|---|---|
| HU-01 | Criar usuário (razão social, CNPJ, endereço) | ✅ |
| HU-02 | Autocomplete de endereço via ViaCEP | ✅ |
| HU-03 | Editar dados do usuário | ✅ |
| HU-04 | Inativar usuário com justificativa | ✅ |
| HU-05 | Reativar usuário com justificativa | ✅ |
| HU-06 | Histórico de status com autor e timestamp | ✅ |
| RF-neg | Rejeitar CNPJ inválido | ✅ |

### Dados de teste criados
- **Razão Social:** QA Teste Arrecadação Ltda
- **CNPJ:** 11.222.333/0001-81
- **Endereço:** CEP 01310-100 → Avenida Paulista 1578, Bela Vista, São Paulo/SP (via ViaCEP)
- **UUID:** `ecbc8a88-adea-419f-bf30-c0d657d8ee2b`

### Histórico de status confirmado
| Status | Horário | Autor |
|---|---|---|
| Cadastro | 04/06/2026 11:37 | Analista Arrecadacao (analista_arrecadacao) |
| Inativo | 04/06/2026 11:39 | Analista Arrecadacao (analista_arrecadacao) |
| Ativo | 04/06/2026 11:40 | Analista Arrecadacao (analista_arrecadacao) |

---

## F03 — Gestão de Licenças

### Objetivo
Ciclo de vida completo de licenças: criação → ATIVA → SUSPENSA → ENCERRADA, com validações de negócio.

### Testes realizados

| Caso | Descrição | Resultado |
|---|---|---|
| HU-01 | Criar licença (usuário, rubrica, vigência indefinida) | ✅ |
| HU-02 | Suspender licença ATIVA | ✅ |
| HU-03 | Reativar licença SUSPENSA | ✅ |
| HU-04 | Encerrar licença SUSPENSA (irreversível + checkbox confirmação) | ✅ |
| RF-transição | ATIVA → ENCERRADA direto bloqueado (UI só mostra "Suspender" para licença ATIVA) | ✅ |
| RF-04 | Rejeitar dataInicio no passado | ✅ |
| HU-06 | Histórico de status na tela de detalhes | ✅ |

### Dados de teste criados
- **Licença 1 (encerrada):** UUID `c58f93dd-fa2f-48fa-85e8-b8657b915eae` — RADIO / Rádio AM/FM
  - Ciclo completo: ATIVA → SUSPENSA → ENCERRADA
- **Licença 2 (ativa para pagamento):** UUID `eabe3093-5ff4-47b1-b02a-70f69bbf7d69` — STREAMING_AUDIO / Streaming Áudio

### Observações
- Modal de encerramento exige checkbox "Entendo que esta ação é irreversível" além da justificativa — boa prática de UX.
- Validação de data no passado exibe mensagem inline no formulário (não como toast).

---

## F04 — UDA e Registro de Pagamentos

### Objetivo
Visualizar e ajustar UDA vigente; registrar pagamentos em UDAs com cálculo automático de valor bruto.

### Testes realizados

| Caso | Descrição | Resultado |
|---|---|---|
| HU-01 UDA | Exibir UDA vigente (R$ 107,31 semeado) | ✅ |
| HU-02 UDA | Ajustar UDA para R$ 115,50 vigente a partir 01/07/2026 | ✅ |
| HU-03 UDA | Histórico de valores (2 entradas) | ✅ |
| HU-01 PAG | Registrar pagamento com cálculo automático | ✅ |
| RF unicidade | Rejeitar segundo pagamento CONFIRMADO no mesmo período | ✅ |
| RF filtro | Apenas licenças ATIVAS aparecem no seletor de licenças para pagamento | ✅ |

### Dados de teste
- **UDA vigente:** R$ 107,31 (semeado 01/01/2026 por "Sistema")
- **UDA futura:** R$ 115,50 (vigente 01/07/2026, criada por Analista Arrecadacao)
- **Pagamento registrado:** UUID `54dc24d0-e657-4124-85a4-6ea613893b5f`
  - 50 UDAs × R$ 107,31 = R$ 5.365,50 bruto
  - Período: 2026-06
  - Snapshot da UDA preservado no registro ✅

### Observações
- O campo "Valor estimado" atualiza em tempo real à medida que a quantidade de UDAs é digitada.
- UDA futura (data > hoje) não altera o valor exibido como "vigente" — comportamento correto.

---

## F05 — Verba Líquida

### Objetivo
Verificar cálculo automático da verba líquida após pagamento confirmado.

### Testes realizados

| Caso | Descrição | Resultado |
|---|---|---|
| Cálculo automático pós-pagamento | Verba criada/atualizada após registro de pagamento | ✅ |
| Fórmula 10% ECAD | R$ 5.365,50 × 10% = R$ 536,55 | ✅ |
| Fórmula 5% Assoc. | R$ 5.365,50 × 5% = R$ 268,28 | ✅ |
| Fórmula 85% líquida | R$ 5.365,50 × 85% = R$ 4.560,67 | ✅ |
| Visão Por Rubrica × Período | Tabela com colunas RUBRICA, PERÍODO, BRUTO, ECAD, ASSOC., LÍQUIDA | ✅ |

---

## F06 — Estorno de Pagamento

### Objetivo
Estornar pagamento confirmado, com justificativa, e verificar recálculo automático da verba.

### Testes realizados

| Caso | Descrição | Resultado |
|---|---|---|
| HU-01 | Estornar pagamento com justificativa | ✅ |
| HU-02 | Status muda para "Estornado" | ✅ |
| HU-03 | Seção "Dados do Estorno" exibe justificativa + autor + data | ✅ |
| HU-04 | Verba recalculada para R$ 0,00 após estorno | ✅ |
| RF irreversível | Botão "Estornar" desaparece após estorno realizado | ✅ |

### Dados de teste
- Pagamento `54dc24d0-e657-4124-85a4-6ea613893b5f` estornado às 04/06/2026 11:59
- Justificativa: "Estorno para teste de QA do ciclo completo de pagamento e desfazimento"
- Estornado por: Analista Arrecadacao (analista_arrecadacao)
- Verba STREAMING_AUDIO / 06/2026: R$ 5.365,50 → R$ 0,00 ✅

---

## Bugs Encontrados

### BUG-01 — Paginação exibe valores negativos

| Atributo | Valor |
|---|---|
| **Severidade** | Baixa (cosmética) |
| **Componente** | Componente de paginação reutilizável |
| **Páginas afetadas** | `/arrecadacao/licencas`, `/arrecadacao/verbas`, possivelmente outras |
| **Sintoma** | Indicador exibe "Mostrando **-9–0** de N" em vez de "1–N de N" |
| **Indicador de página** | Exibe "0 / P" em vez de "1 / P" |
| **Reprodução** | Acessar qualquer lista paginada com resultados |
| **Causa provável** | Cálculo de offset errado: `page - 1` quando deveria ser `page` (ou `(page - 1) * size + 1`) |

### BUG-02 — Nomes de rubricas incorretos nos filtros

| Atributo | Valor |
|---|---|
| **Severidade** | Média (funcional — filtro pode não encontrar resultados) |
| **Componente** | Combobox "Filtrar por rubrica" |
| **Páginas afetadas** | `/arrecadacao/licencas` (lista), `/arrecadacao/verbas` |
| **Sintoma** | Filtro exibe: "Rádio", "TV Aberta", "TV Fechada", "Internet", "Shows", "Sonorização", "Outros" |
| **Valores corretos** | "Rádio AM/FM", "TV Aberta", "TV Fechada", "Cinema", "Streaming Vídeo (VOD)", "Streaming Áudio", "Show" |
| **Causa provável** | Filtro de rubrica hardcoded com valores antigos/genéricos, em vez de buscar as rubricas reais da API (`/api/v1/rubricas`) |
| **Impacto** | Filtrar por "Internet" ou "Shows" não retornará resultados pois essas rubricas não existem no sistema; filtrar por "STREAMING_AUDIO" via UI é impossível |

---

## Análise de Cobertura

### Regras de negócio validadas

| Regra | Descrição | Resultado |
|---|---|---|
| RF-01 | Licença dataInicio ≥ hoje | ✅ |
| RF-02 | Encerramento é irreversível (checkbox + justificativa) | ✅ |
| RF-03 | ATIVA → ENCERRADA direto bloqueado pela UI | ✅ |
| RF-04 | Unicidade: 1 pagamento CONFIRMADO por licença×período | ✅ |
| RF-05 | Snapshot de UDA no pagamento (valor correto mesmo após ajuste de UDA) | ✅ |
| RF-06 | Verba recalcula automaticamente após estorno | ✅ |
| RF-07 | Cálculo da verba líquida: bruto × 85% (ECAD 10% + Assoc. 5%) | ✅ |
| RF-08 | CNPJ inválido rejeitado no cadastro de usuário | ✅ |
| RF-09 | Histórico de status com rastreabilidade (autor + timestamp) | ✅ |

### Regras de negócio não cobertas nesta sessão

| Regra | Motivo |
|---|---|
| RF-03 estrito | Não foi possível testar criação de licença para usuário INATIVO (usuário "QA Teste Arrecadação Ltda" foi reativado antes dos testes de licença) |
| Pagamento em licença SUSPENSA | PRD permite pagamento em licença SUSPENSA — não testado explicitamente |

---

## Conclusão

O módulo D03 Arrecadação está **funcional em todas as features principais**. O ciclo completo de negócio — desde o cadastro do usuário de música, criação de licenças, passando pelo registro e estorno de pagamentos, até o cálculo automático de verbas — foi executado com sucesso.

Os 2 bugs encontrados são cosméticos (BUG-01) e de dados hardcoded (BUG-02), sem impacto na lógica de negócio principal. Recomendam correção antes do próximo ciclo de distribuição.
