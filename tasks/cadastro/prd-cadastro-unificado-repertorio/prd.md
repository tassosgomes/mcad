# PRD — Cadastro Unificado de Repertório

> **Domínio:** Cadastro (D01)  
> **Feature:** Cadastro Unificado de Repertório  
> **Prioridade:** Must Have  
> **Status:** `prd-ready`  
> **Data:** 2026-07-09

## Visão Geral

O Cadastro já mantém corretamente Titulares, Obras Musicais, Fonogramas, Titularidades Autorais e Participações Conexas. Entretanto, o Analista de Cadastro precisa concluir essas ações em telas e operações separadas: criar ou localizar titulares, criar a obra, informar as titularidades, criar cada fonograma, definir as participações e, por fim, solicitar o ISWC. A sequência fragmenta uma intenção única de negócio — cadastrar um repertório pronto para uso — e aumenta o risco de cadastros incompletos.

Esta feature cria a jornada **Cadastro Unificado de Repertório**. Em uma única experiência, o Analista informa uma obra, reutiliza ou cadastra titulares, define as participações autorais e conexas, adiciona um ou mais fonogramas e conclui a solicitação do ISWC. O resultado local deve ser salvo integralmente ou não ser salvo.

O termo *Repertório* nesta feature representa uma jornada de cadastro composta. Ele **não** substitui as entidades de domínio existentes nem cria uma nova fonte de verdade para Obras, Fonogramas ou Titulares.

## Objetivos

| Objetivo | Métrica de sucesso |
|---|---|
| Reduzir fragmentação operacional | Analista conclui o cadastro completo em uma única jornada, sem navegar para as telas individuais. |
| Preservar integridade do Cadastro | Zero persistências parciais quando a confirmação falhar. |
| Reutilizar master data | Tentativas com CPF/CNPJ já existente resultam na seleção do Titular existente, sem duplicação. |
| Tornar pendências visíveis antes da confirmação | 100% das regras obrigatórias são apresentadas no resumo final antes do envio. |
| Entregar repertório utilizável | Em sucesso, Obra possui ISWC e está LIBERADA; diante de falha de ISWC, o Analista pode salvar o cadastro íntegro com a Obra PENDENTE. |

## Histórias de Usuário

### HU-01 — Cadastrar repertório completo

**Como** Analista de Cadastro,  
**quero** cadastrar a Obra, seus titulares, um ou mais Fonogramas e suas participações na mesma jornada,  
**para que** eu conclua o repertório sem repetir navegação e operações manuais.

### HU-02 — Reutilizar titular existente

**Como** Analista de Cadastro,  
**quero** localizar um Titular pelo CPF/CNPJ durante o cadastro,  
**para que** eu o reutilize sem criar um cadastro duplicado.

### HU-03 — Corrigir erros antes de gravar

**Como** Analista de Cadastro,  
**quero** ver as pendências por etapa e no resumo final,  
**para que** eu corrija percentuais ou dados obrigatórios antes da confirmação.

### HU-04 — Consultar o resultado

**Como** Consultor,  
**quero** consultar a Obra e os Fonogramas resultantes nas telas existentes,  
**para que** eu valide o cadastro sem precisar de uma nova entidade de consulta.

## Funcionalidades Principais

### 1. Jornada única de cadastro

| # | Requisito | MoSCoW |
|---|---|---|
| RF-01 | O sistema deve disponibilizar a ação **Novo Repertório** para iniciar uma jornada única de cadastro. | Must Have |
| RF-02 | A jornada deve organizar o preenchimento em etapas de: dados da Obra, titulares e titularidades autorais, Fonogramas e participações conexas, e revisão final. | Must Have |
| RF-03 | O usuário deve poder avançar e retornar entre etapas sem persistir dados parciais. | Must Have |
| RF-04 | A conclusão do cadastro unificado deve exigir uma Obra, ao menos uma titularidade autoral cuja soma seja 100%, e um ou mais Fonogramas. | Must Have |

**Critérios de aceitação — RF-04**

- **Dado** que a soma das titularidades autorais é diferente de 100%, **quando** o Analista tenta avançar para a revisão, **então** o sistema bloqueia a confirmação e indica a pendência na etapa de titularidades.
- **Dado** que a Obra não possui Fonogramas, **quando** o Analista tenta confirmar o cadastro, **então** o sistema informa que ao menos um Fonograma é obrigatório para concluir o repertório.

### 2. Titulares e titularidades autorais

| # | Requisito | MoSCoW |
|---|---|---|
| RF-05 | O sistema deve permitir buscar Titular existente por CPF/CNPJ antes de incluir uma titularidade ou participação. | Must Have |
| RF-06 | Ao localizar CPF/CNPJ existente, o sistema deve usar o Titular existente e impedir a criação de outro Titular com o mesmo documento. | Must Have |
| RF-07 | Quando não existir Titular para o CPF/CNPJ informado, o sistema deve permitir seu cadastro no contexto da jornada. | Must Have |
| RF-08 | O sistema deve permitir atribuir a cada Titular autoral a categoria e o percentual da titularidade na Obra. | Must Have |
| RF-09 | O sistema deve manter as regras atuais: percentual autoral total de 100%, percentual maior que zero e Editor somente para Titular PJ. | Must Have |

**Critérios de aceitação — RF-06**

- **Dado** um CPF/CNPJ já cadastrado, **quando** o Analista o informa, **então** o sistema apresenta o Titular correspondente para seleção e não oferece a criação de duplicata.

**Critérios de aceitação — RF-09**

- **Dado** um Titular Pessoa Física, **quando** o Analista tenta incluí-lo como Editor, **então** o sistema rejeita a inclusão com mensagem clara.

### 3. Fonogramas e participações conexas

| # | Requisito | MoSCoW |
|---|---|---|
| RF-10 | O sistema deve permitir incluir diversos Fonogramas vinculados à Obra informada na mesma jornada. | Must Have |
| RF-11 | Cada Fonograma deve possuir ISRC válido e único, conforme as regras atuais do Cadastro. | Must Have |
| RF-12 | Para cada Fonograma, o sistema deve permitir incluir Titulares existentes ou novos como Intérprete, Produtor Fonográfico ou Músico Executante. | Must Have |
| RF-13 | O sistema deve calcular automaticamente as participações conexas de cada Fonograma e exibir os percentuais antes da confirmação. | Must Have |
| RF-14 | A confirmação deve exigir, em cada Fonograma, ao menos um Intérprete e um Produtor Fonográfico. | Must Have |

**Critérios de aceitação — RF-13 e RF-14**

- **Dado** um Fonograma com intérprete, produtor e músicos executantes, **quando** o Analista revisa suas participações, **então** o sistema exibe percentuais calculados segundo as regras vigentes, inclusive o arredondamento aplicável.
- **Dado** um Fonograma sem Produtor Fonográfico, **quando** o Analista tenta confirmar, **então** o sistema bloqueia a operação e identifica o Fonograma pendente.

### 4. Revisão, ISWC e confirmação

| # | Requisito | MoSCoW |
|---|---|---|
| RF-15 | Antes da confirmação, o sistema deve apresentar um resumo completo da Obra, Titulares, titularidades, Fonogramas e participações calculadas. | Must Have |
| RF-16 | A confirmação deve solicitar o ISWC da Obra antes da persistência local. | Must Have |
| RF-17 | Se o ISWC não puder ser obtido, o sistema deve apresentar ao Analista as opções de tentar novamente ou salvar o cadastro íntegro com a Obra PENDENTE. | Must Have |
| RF-18 | Quando o ISWC for obtido, a Obra deve recebê-lo e ficar LIBERADA; os Fonogramas devem ser criados com suas participações calculadas. | Must Have |
| RF-19 | Quando o Analista escolher salvar após uma falha de ISWC, o sistema deve criar todos os dados locais em uma única transação, mantendo a Obra sem ISWC no status PENDENTE. | Must Have |

**Critérios de aceitação — RF-17 e RF-19**

- **Dado** que a integração de ISWC retorna erro ou indisponibilidade, **quando** o Analista confirma o cadastro, **então** o sistema oferece as ações “Tentar novamente” e “Salvar como pendente”.
- **Dado** uma falha na integração de ISWC, **quando** o Analista escolhe “Tentar novamente”, **então** nenhum dado local da jornada é gravado antes da nova tentativa.
- **Dado** uma falha na integração de ISWC, **quando** o Analista escolhe “Salvar como pendente”, **então** Titulares novos, Obra, titularidades, Fonogramas e participações são gravados juntos, e a Obra permanece PENDENTE e sem ISWC.

### 5. Atomicidade, segurança e rastreabilidade

| # | Requisito | MoSCoW |
|---|---|---|
| RF-20 | Titulares novos, Obra, Titularidades, Fonogramas e Participações devem ser persistidos em uma única transação local. | Must Have |
| RF-21 | Se qualquer validação ou gravação local falhar, toda a operação local deve ser revertida. | Must Have |
| RF-22 | A jornada deve exigir a nova permissão `cadastro:default:repertorio:criar`. | Must Have |
| RF-23 | O sistema deve registrar auditoria das entidades efetivamente criadas na confirmação bem-sucedida, preservando o autor da operação. | Must Have |

**Critérios de aceitação — RF-20 e RF-21**

- **Dado** que a criação do segundo Fonograma falha por ISRC duplicado, **quando** a operação é confirmada, **então** nenhuma entidade da jornada é persistida localmente.

## Experiência do Usuário

A jornada deve ser apresentada como um wizard claro, com indicador de etapas, validação no contexto de cada dado e um resumo final navegável. O usuário pode voltar para corrigir qualquer etapa antes de confirmar. A busca de Titular deve priorizar CPF/CNPJ e exibir dados suficientes para evitar seleção equivocada. O resumo deve evidenciar totais autorais e participações de cada Fonograma, incluindo alertas de inconsistência.

Após a confirmação, o sistema deve exibir os códigos criados, o ISWC quando obtido e links para a Obra e para os Fonogramas nas telas de detalhe já existentes. Se a Obra for salva PENDENTE, a interface deve deixar clara a ausência do ISWC e a possibilidade de solicitá-lo posteriormente. Consultores permanecem em modo somente leitura.

## Restrições Técnicas de Alto Nível

- A feature pertence exclusivamente ao bounded context Cadastro e ao seu schema isolado.
- A atomicidade obrigatória aplica-se à persistência local. A integração de ISWC é externa e não participa da transação do banco.
- A solicitação de ISWC deve ocorrer antes da gravação local. Em caso de falha, o Analista decide entre nova tentativa, sem persistência, ou a gravação integral da jornada com a Obra PENDENTE.
- Deve ser preservada a semântica atual de Obra, Fonograma, Titular, Titularidade Autoral e Participação Conexa, suas regras de status, auditoria e eventos de domínio.
- A jornada deve ser protegida pela permissão específica `cadastro:default:repertorio:criar`; permissões granulares das telas legadas não substituem essa autorização.

## Não-Objetivos (Fora de Escopo)

- Criar um novo agregado de domínio ou uma nova entidade persistente chamada Repertório.
- Salvar rascunhos, pausar ou retomar a jornada posteriormente.
- Alterar as telas individuais existentes de Titulares, Obras ou Fonogramas; elas continuam atendendo manutenção e consulta.
- Alterar regras de cálculo, percentuais ou ciclo de vida já definidos para titularidades e participações conexas.
- Implementar idempotência, transação distribuída ou compensação automática na integração externa de ISWC.
- Importar repertórios em lote.

## Riscos e Premissas

| Item | Tratamento |
|---|---|
| ISWC é emitido por serviço externo e não participa da transação local | Em falha, permitir nova tentativa ou persistir a jornada íntegra com a Obra PENDENTE; a solicitação posterior de ISWC continua disponível nas telas existentes. |
| Um mesmo Titular pode ter vários papéis | Preservar os vínculos independentes por categoria e impedir apenas duplicata do mesmo titular/categoria na mesma entidade. |
| Formulário composto pode se tornar extenso | Organizar por etapas, oferecer revisão e mostrar pendências de forma consolidada. |
| Registros existentes precisam continuar sendo reutilizáveis | Busca por CPF/CNPJ antes de criação e validação definitiva de unicidade na confirmação. |

## Alternativas Consideradas

1. **Criar a entidade/agregado Repertório:** descartada. Não há ciclo de vida, identidade ou regras próprias além da operação de cadastro; Obra, Fonograma e Titular continuam sendo as fontes de verdade.
2. **Apenas reunir chamadas existentes no frontend:** descartada. Não garante atomicidade nem oferece uma resposta única de validação.
3. **Salvar cada etapa como rascunho:** descartada neste escopo por decisão de produto; a jornada só persiste ao confirmar.

## Impacto Técnico (alto nível)

Será necessário expor uma operação composta no Cadastro, ajustar o frontend com a nova jornada, adicionar a permissão `cadastro:default:repertorio:criar` ao catálogo de autorização e garantir testes de fluxo transacional, validações, autorização e os dois caminhos de falha da integração ISWC. Como a superfície de API será ampliada, os contratos OpenAPI do serviço deverão ser exportados e versionados conforme o Contract Gate do projeto.

## Rastreabilidade

### Vision Doc

- **Objetivo atendido:** tornar o Cadastro uma fonte de verdade íntegra para os domínios de Identificação e Distribuição.
- **Perfil:** Analista de Cadastro; Consultor como leitor.
- **Restrição global:** arquitetura de microsserviços com schema-per-service, eventos e auditoria.

### Domain Doc — Cadastro (D01)

- **Entidades envolvidas:** Titular, Associação, Obra Musical, Titularidade Autoral, Fonograma e Participação Conexa.
- **Regras referenciadas:** RN-01, RN-03, RN-04, RN-05, RN-07, RN-08, RN-09, RN-11, RN-12, RN-13 e RN-15.
- **Eventos relevantes:** `cadastro.titular.criado`, `cadastro.obra.liberada` e eventos de Fonograma previstos pelo ciclo de vida atual.
- **Dependências downstream:** Identificação e Distribuição continuam consumindo Obras, Fonogramas e seus vínculos pelos contratos existentes.

## Questões em Aberto

- A integração de ISWC permite distinguir com segurança uma indisponibilidade de uma solicitação que tenha sido processada remotamente, evitando uma emissão duplicada quando o Analista escolher tentar novamente?
