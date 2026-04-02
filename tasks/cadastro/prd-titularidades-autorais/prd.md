# PRD — F04: Titularidades Autorais

> **Domínio:** Cadastro (D01)
> **Feature ID:** F04
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-03-31

---

## Visão Geral

Titularidades Autorais representam o vínculo entre titulares e obras musicais — definindo quem detém qual percentual de direitos autorais de cada composição. É a regra de negócio mais crítica do domínio Cadastro: a soma dos percentuais de uma obra DEVE ser exatamente 100% para que a obra possa ser liberada para distribuição.

Esta feature é gerenciada **dentro da tela de Obras** (não em tela separada) como uma seção "Titulares Autorais". O Analista busca titulares existentes (F02), define a categoria (Autor/Compositor ou Editor) e atribui o percentual. A soma pode ficar temporariamente diferente de 100% (obra permanece PENDENTE), mas a progressão para LIBERADO exige soma exata.

**Interação com depuração (F03):** Em obras LIBERADAS, qualquer alteração na lista de titulares (adicionar, remover, editar percentual) dispara o mecanismo de depuração — a obra original torna-se DEPURADA e uma nova obra é criada automaticamente.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Vinculação correta de titulares a obras | 100% das obras LIBERADAS com soma de titularidades = 100% |
| Editor sempre PJ | Zero registros de Editor vinculado a titular PF |
| Feedback visual da soma | Analista vê a soma em tempo real a cada operação |
| Depuração consistente | Qualquer alteração de titularidade em obra LIBERADA dispara depuração |

---

## Histórias de Usuário

### HU-01 — Adicionar titular autoral a uma obra
**Como** Analista de Cadastro,
**eu quero** buscar um titular existente, definir sua categoria (Autor ou Editor) e percentual,
**para que** os direitos autorais da obra sejam registrados corretamente.

### HU-02 — Visualizar soma dos percentuais
**Como** Analista de Cadastro,
**eu quero** ver a soma atual dos percentuais de titularidade da obra em tempo real,
**para que** eu saiba se a distribuição está completa (100%) ou pendente.

### HU-03 — Editar percentual de uma titularidade
**Como** Analista de Cadastro,
**eu quero** alterar o percentual de um titular já vinculado à obra,
**para que** correções na divisão de direitos sejam feitas sem remover e readicionar.

### HU-04 — Remover titular autoral de uma obra
**Como** Analista de Cadastro,
**eu quero** desvincular um titular de uma obra,
**para que** titulares incorretamente atribuídos sejam removidos.

### HU-05 — Depuração ao alterar titulares de obra LIBERADA
**Como** sistema,
**eu preciso** disparar depuração quando titularidades de uma obra LIBERADA são alteradas,
**para que** o histórico da obra original com ISWC seja preservado de forma imutável.

---

## Funcionalidades Principais

### 1. Adicionar Titularidade Autoral

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Na tela de detalhe da obra, seção "Titulares Autorais", o Analista pode adicionar uma titularidade: buscar titular existente via autocomplete (nome ou CPF/CNPJ), selecionar categoria (Autor/Compositor ou Editor) e informar percentual | Must Have |
| RF-02 | A busca de titular utiliza autocomplete com pesquisa parcial, case-insensitive, nos campos nome e documento (CPF/CNPJ) | Must Have |
| RF-03 | Se a categoria for Editor, o sistema valida que o titular selecionado é PJ (CNPJ). Se for PF, rejeita com mensagem: "A categoria Editor exige titular Pessoa Jurídica" (RN-11) | Must Have |
| RF-04 | O percentual deve aceitar valores decimais com até 4 casas (RN-08). Valores aceitos: 0.0001 a 100.0000 | Must Have |
| RF-05 | Um mesmo titular pode ser vinculado à mesma obra com categorias diferentes (ex: titular X como Autor com 75% e Editor com 25%) (RN-07) | Must Have |
| RF-06 | Não é permitido vincular o mesmo titular com a mesma categoria duas vezes à mesma obra | Must Have |

**Critérios de Aceitação — RF-03:**
- **Given** o titular "Editora ABC" é PJ (CNPJ) e "Djavan" é PF (CPF)
- **When** o Analista tenta adicionar "Djavan" como Editor
- **Then** o sistema rejeita: "A categoria Editor exige titular Pessoa Jurídica"
- **And** se tentar adicionar "Editora ABC" como Editor → aceita

**Critérios de Aceitação — RF-05:**
- **Given** a obra "Meu Bem Querer" já tem "Djavan" como Autor (75%)
- **When** o Analista adiciona "Djavan" como Editor (25%) da mesma obra
- **Then** o sistema aceita — Djavan aparece 2x na lista com categorias distintas

**Critérios de Aceitação — RF-06:**
- **Given** a obra já tem "Djavan" como Autor
- **When** o Analista tenta adicionar "Djavan" como Autor novamente
- **Then** o sistema rejeita: "Este titular já está vinculado como Autor nesta obra"

### 2. Soma e Validação de Percentuais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-07 | Após cada operação (add/edit/remove), exibir a soma atualizada dos percentuais de todas as titularidades da obra | Must Have |
| RF-08 | A soma pode ser temporariamente diferente de 100% — a obra permanece PENDENTE | Must Have |
| RF-09 | Indicador visual da soma: verde se 100%, amarelo se < 100%, vermelho se > 100% | Should Have |
| RF-10 | Obra não pode progredir para status LIBERADO se soma != 100% (validação em F07, mas o indicador informa aqui) | Must Have |
| RF-11 | Arredondamento conforme RN-12: truncar para 4 casas decimais, diferença atribuída ao primeiro titular da lista | Must Have |

**Critérios de Aceitação — RF-07:**
- **Given** a obra tem Djavan (60%) e Editora X (30%)
- **When** o Analista visualiza a seção de titularidades
- **Then** exibe "Soma: 90%" com indicador amarelo (incompleto)

**Critérios de Aceitação — RF-08:**
- **Given** a soma das titularidades é 90% (< 100%)
- **When** o Analista tenta salvar
- **Then** o sistema aceita — a obra permanece PENDENTE

**Critérios de Aceitação — RF-11:**
- **Given** uma obra com 3 autores com percentuais que somam 99.9999% por arredondamento
- **When** o sistema calcula a soma
- **Then** aplica algoritmo de alocação de remanescente (RN-12) para fechar 100.0000%

### 3. Editar Titularidade

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-12 | O Analista pode editar o percentual de uma titularidade existente | Must Have |
| RF-13 | A categoria NÃO pode ser alterada — se o Analista precisa mudar a categoria, deve remover e readicionar | Must Have |
| RF-14 | Após edição, a soma é recalculada e o indicador atualizado | Must Have |

### 4. Remover Titularidade

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-15 | O Analista pode remover uma titularidade da obra | Must Have |
| RF-16 | Após remoção, a soma é recalculada (pode ficar < 100%) | Must Have |
| RF-17 | Se a obra ficar sem nenhuma titularidade, a soma exibe "0%" | Must Have |

### 5. Listar Titularidades da Obra

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-18 | A seção exibe tabela com: nome do titular, tipo (PF/PJ badge), documento formatado (mono), categoria (Autor/Editor), percentual (mono, 4 casas) | Must Have |
| RF-19 | A soma total é exibida no rodapé da tabela | Must Have |
| RF-20 | Para obras DEPURADAS, a lista é read-only (sem botões de ação) | Must Have |

### 6. Depuração ao Alterar Titularidades

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | Em obra com status LIBERADO, qualquer operação de titularidade (adicionar, remover, editar percentual) dispara confirmação de depuração | Must Have |
| RF-22 | O modal de depuração informa: "Alterar os titulares desta obra irá depurá-la. A obra atual ficará imutável e uma nova obra será criada. Deseja continuar?" | Must Have |
| RF-23 | Ao confirmar: obra original → DEPURADA, nova obra criada → PENDENTE (sem ISWC), as titularidades da obra original são copiadas para a nova obra com as alterações aplicadas | Must Have |
| RF-24 | Ao cancelar: nenhuma alteração é feita | Must Have |

**Critérios de Aceitação — RF-23:**
- **Given** a obra "Meu Bem Querer" (LIBERADA, ISWC T-336305833-4) tem: Djavan 60%, Editora X 40%
- **When** o Analista adiciona "Tasso" como Autor (20%) e confirma depuração
- **Then** obra original "Meu Bem Querer" → DEPURADA (imutável, mantém ISWC, Djavan 60% + Editora X 40%)
- **And** nova obra "Meu Bem Querer" → PENDENTE (sem ISWC, com Djavan 60% + Editora X 40% + Tasso 20% — soma 120%, precisa ajustar)

### 7. Integração com Obtenção de ISWC (F03)

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-25 | O botão "Obter ISWC" (F03) é habilitado quando a obra tem ao menos uma titularidade autoral | Must Have |
| RF-26 | Ao obter ISWC, o sistema usa os nomes dos titulares autorais desta feature para o campo `authors` da API | Must Have |
| RF-27 | A associação selecionada para a API ISWC é a do titular com maior percentual (empate → primeiro) | Must Have |

**Critérios de Aceitação — RF-27:**
- **Given** a obra tem: Djavan (50%, ABRAMUS) e Tasso (50%, UBC)
- **When** o sistema seleciona a associação para o ISWC
- **Then** seleciona ABRAMUS (Djavan é o primeiro em caso de empate 50/50)

---

## Experiência do Usuário

### Fluxo Principal — Adicionar Titularidade
1. Analista acessa a tela de detalhe de uma obra (PENDENTE)
2. Na seção "Titulares Autorais", clica em "Adicionar Titular"
3. Campo de busca aparece — digita nome ou CPF/CNPJ
4. Autocomplete sugere titulares existentes
5. Seleciona o titular → campo de categoria aparece (Autor/Editor)
6. Seleciona categoria → campo de percentual aparece
7. Informa percentual → clica "Adicionar"
8. Titular aparece na tabela, soma atualizada no rodapé

### Fluxo — Depuração
1. Analista acessa obra LIBERADA
2. Tenta adicionar/remover/editar titularidade
3. Modal: "Alterar os titulares irá depurar esta obra..."
4. Confirma → obra depurada, nova obra criada com titularidades copiadas + alteração
5. Redirect para nova obra

### Considerações de UI
- Seção de titularidades integrada à `ObraDetailPage` (não página separada)
- Autocomplete de titular: exibe nome + tipo (PF/PJ badge) + documento (mono)
- Percentual com input numérico, 4 casas decimais, sufixo "%"
- Soma no rodapé: "Total: 100.0000%" com indicador de cor
- Para Consultor: tabela read-only, sem botões de ação
- Para obras DEPURADAS: tabela read-only + banner de depuração (de F03)

---

## Restrições Técnicas de Alto Nível

- Titularidades são sub-recurso de Obra: `/api/v1/obras/{obraId}/titularidades`
- Percentuais com precisão decimal (4 casas) — tipos Decimal no backend
- Validação de soma é server-side (não confiar apenas no frontend)
- A depuração de titularidades reutiliza o mecanismo de F03 (POST /obras/{id}/depurar)
- Tabela `titularidades_autorais` no schema `cadastro` com FK para obras e titulares

---

## Não-Objetivos (Fora de Escopo)

- Não cria titulares inline (busca de existentes via F02)
- Não gerencia participações conexas (F06 — vinculadas a fonogramas)
- Não transiciona status para LIBERADO automaticamente (F07)
- Não calcula percentuais sugeridos (100% / N titulares)
- Não implementa histórico de alterações de titularidades
- Não permite alterar categoria de titularidade existente (remover + readicionar)

---

## Rastreabilidade

### Domain Doc (Cadastro — D01)
- **Feature:** F04 — Titularidades Autorais
- **Entidade:** Titularidade Autoral
- **Regras referenciadas:** RN-01 (soma=100%), RN-07 (acúmulo papéis), RN-08 (precisão decimal), RN-11 (Editor exige PJ), RN-12 (arredondamento)
- **Dependências:** Upstream: F02 (Titulares), F03 (Obras + depuração); Downstream: F06 (Conexos referenciam obra), F07 (Controle de Status verifica soma)
- **Integração:** F03 RF-16/RF-26/RF-27 (botão ISWC depende de titularidades)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
