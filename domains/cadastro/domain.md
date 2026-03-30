# Domain Document — Cadastro

> **Nível 1 da hierarquia de documentação.** Este documento detalha o bounded context do domínio Cadastro. Sempre forneça o `vision.md` junto com este arquivo ao iniciar sessões de PRD ou Tech Spec dentro deste domínio.

**Domínio:** Cadastro
**Responsável:** a definir
**Status:** `planned`
**Fase do Roadmap:** Fase 1 — Fundação + Cadastro (MVP)
**Última revisão:** 2026-03-29

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
Ser a fonte de verdade do master data musical — centralizar e manter Obras Musicais, Fonogramas e Titulares, garantindo a integridade das titularidades autorais e participações conexas que alimentam todo o fluxo de distribuição.

### Problema que Resolve
Sem um cadastro centralizado e validado, os domínios de Identificação e Distribuição não têm base confiável para operar. O Cadastro garante que os percentuais de titularidade autoral somam 100%, que as participações conexas seguem as regras do Regulamento, e que apenas registros com status LIBERADO entram no fluxo de distribuição.

### Fora do Escopo deste Domínio (Out of Scope)
- Verificação inteligente de duplicidade (fuzzy matching) → simplificado para: mesmo título + mesma lista de titulares
- Cálculo automático de Domínio Público por data de falecimento → apenas flag manual
- Gestão de Associações → tabela pré-cadastrada (seed), não editável pelo usuário
- Categoria Subeditor → fora do escopo da PoC
- Identificação de execuções musicais → domínio Identificação (D02)
- Cálculo de créditos e valores de distribuição → domínio Distribuição (D04)
- Gestão de usuários de música (licenciados) → domínio Arrecadação (D03)

---

## 2. Usuários do Domínio (Domain Users)

| Perfil (Role) | O que faz neste domínio | Frequência de uso |
|---|---|---|
| Analista de Cadastro | Cadastra e mantém obras, fonogramas, titulares e titularidades. Gerencia status e resolve pendências. | Diária |
| Consultor | Consulta dados cadastrais para validação e conferência. Acesso somente leitura. | Diária |

---

## 3. Entidades Principais (Core Entities)

> Entidades são os objetos de negócio centrais deste domínio. Não é um schema de banco de dados — é o vocabulário do domínio.

| Entidade | Descrição | Atributos Principais | Relacionamentos |
|---|---|---|---|
| Obra Musical | Composição protegida por direito autoral. Pode ser instrumental (MUSICAL), com letra (LITEROMUSICAL), traduzida (VERSAO) ou medley (POT_POURRI). | ISWC, título, subtítulo, gênero, tipo, status | possui: Titularidades Autorais; referenciada por: Fonogramas |
| Fonograma | Gravação específica de uma obra musical. Cada fonograma é uma interpretação/versão gravada distinta. | ISRC, país de origem, data de gravação, data de lançamento, status | pertence a: Obra Musical; possui: Participações Conexas |
| Titular | Pessoa física ou jurídica detentora de direitos autorais e/ou conexos. Uma mesma identidade (CPF/CNPJ) pode acumular múltiplos papéis. | CAE/IPI, nome, CPF ou CNPJ, tipo (PF/PJ), nacionalidade, status | vinculado a: Associação; participa de: Titularidades Autorais e Participações Conexas |
| Titularidade Autoral | Vínculo entre um Titular e uma Obra Musical com percentual e categoria autoral. A soma dos percentuais de todas as titularidades de uma obra deve ser exatamente 100%. Autor sem editora recebe 100% da fatia autoral. | categoria (Autor/Compositor, Editor), percentual | vincula: Titular ↔ Obra Musical |
| Participação Conexa | Vínculo entre um Titular e um Fonograma com categoria conexa. Percentuais calculados automaticamente. Fonogramas podem ter múltiplos intérpretes (duetos/feats) — a fatia de intérprete é rateada entre eles (igualitário por default ou percentual configurável). | categoria (Intérprete, Produtor Fonográfico, Músico Executante), percentual (calculado), percentual na fatia do papel (configurável para intérpretes) | vincula: Titular ↔ Fonograma |
| Associação | Entidade de gestão coletiva filiada ao ECAD que representa titulares. Dados pré-cadastrados (seed), não editáveis. | nome, sigla | referenciada por: Titular |

### Associações (seed fixo — 7 registros)
ABRAMUS, AMAR, ASSIM, SBACEM, SICAM, SOCINPRO, UBC

### Categorias de Titulares

**Titulares de Direitos Autorais (vinculados à Obra):**
- Autor/Compositor — criador da melodia, letra ou adaptação (PF)
- Editor — pessoa jurídica que administra e negocia direitos patrimoniais (**obrigatoriamente PJ**). Quando presente, a fatia autoral é tipicamente dividida 75% autor / 25% editor, mas os percentuais são configuráveis. Autor sem editora recebe 100% da fatia autoral.

> **Nota:** As categorias Subeditor e Versionista estão fora do escopo desta PoC.

**Titulares de Direitos Conexos (vinculados ao Fonograma):**
- Intérprete — artista principal, banda, dupla ou grupo que executa a obra (PF). Pode haver múltiplos intérpretes (duetos/feats) — a fatia de 43,7% é rateada entre eles (igualitário por default ou percentual configurável por fonograma).
- Produtor Fonográfico — pessoa física ou jurídica responsável pela gravação (PF ou PJ). Pode haver múltiplos produtores — a fatia de 41,7% é rateada entre eles por percentual configurável.
- Músico Executante — músicos acompanhantes participantes da execução (PF). Os 14,6% são divididos igualmente entre todos os músicos.

---

## 4. Features Previstas (Planned Features)

| # | Feature | Descrição | Prioridade | Status | PRD |
|---|---|---|---|---|---|
| F01 | Seed de Associações | Carga inicial das 7 associações de gestão coletiva. Dados não editáveis pelo usuário. | Must Have | `prd-ready` | `tasks/prd-seed-associacoes/prd.md` |
| F02 | Gestão de Titulares | CRUD de titulares (PF/PJ) com CPF/CNPJ, CAE/IPI, vínculo a associação e categorias. Um titular pode acumular categorias autorais e conexas. | Must Have | `prd-ready` | `tasks/prd-gestao-titulares/prd.md` |
| F03 | Gestão de Obras Musicais | CRUD de obras com ISWC, título, tipo (MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI), gênero e validação de unicidade (título + titulares). | Must Have | `planned` | — |
| F04 | Titularidades Autorais | Vinculação de titulares a obras com categoria e percentual. Validação obrigatória: soma = 100%. | Must Have | `planned` | — |
| F05 | Gestão de Fonogramas | CRUD de fonogramas com ISRC, vínculo à obra, país de origem, datas. Exige ao menos um Produtor Fonográfico. | Must Have | `planned` | — |
| F06 | Participação Conexa Automática | Cálculo automático dos percentuais conexos ao vincular titulares ao fonograma. Com músico: 43,7% intérprete / 41,7% produtor / 14,6% músicos (÷ N). Sem músico: 50% / 50%. | Must Have | `planned` | — |
| F07 | Controle de Status | Fluxo de status para Obras (LIBERADO, BLOQUEADO, PENDENTE, DOMINIO_PUBLICO), Fonogramas (LIBERADO, PENDENTE_VALIDACAO, PENDENTE_DOCUMENTACAO) e Titulares (ATIVO, FALECIDO, TRANSFERINDO). Flag manual para Domínio Público. | Must Have | `planned` | — |
| F08 | Eventos de Cadastro | Publicação de eventos no RabbitMQ a cada mudança relevante de estado, seguindo padrão `cadastro.entidade.acao`. | Must Have | `planned` | — |

**Prioridades (MoSCoW):** `Must Have` · `Should Have` · `Could Have` · `Won't Have`
**Status possíveis:** `planned` · `prd-ready` · `in-progress` · `done` · `out-of-scope`

---

## 5. Dependências (Domain Dependencies)

### Depende de (Upstream)
| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| Nenhum | — | — | — |

O Cadastro é totalmente independente — não depende de nenhum outro domínio.

### Fornece para (Downstream)
| Domínio | O que fornece | Tipo | Criticidade |
|---|---|---|---|
| Identificação | Dados de obras e fonogramas para identificar execuções (consulta por ISRC/ISWC) | Consulta HTTP (Open Host Service) | Alta |
| Distribuição | Titularidades autorais e participações conexas para calcular créditos | Consulta HTTP (Open Host Service) | Alta |
| Analytics | Eventos de mudança de estado para alimentar read models | Evento assíncrono (RabbitMQ) | Média |

### Integrações Externas (External Integrations)
| Sistema Externo | Finalidade | Direção | Status |
|---|---|---|---|
| Nenhum | O Cadastro é auto-contido nesta PoC | — | — |

---

## 6. Regras de Negócio (Business Rules)

| ID | Regra | Origem |
|---|---|---|
| RN-01 | Percentuais de titularidade autoral de uma obra devem somar exatamente 100% | Regulamento de Distribuição |
| RN-02 | Não é permitido cadastrar obras com mesmo título E mesma lista de titulares | Simplificação para PoC (substitui verificação de duplicidade) |
| RN-03 | Todo fonograma deve ter ao menos um Produtor Fonográfico vinculado | Regulamento de Distribuição |
| RN-04 | Participação conexa é calculada automaticamente pelo sistema conforme a composição do fonograma: **com músico executante** → 43,7% intérprete / 41,7% produtor / 14,6% músicos (dividido igualmente entre N músicos, sem limite); **sem músico executante** → 50% intérprete / 50% produtor | Regulamento de Distribuição |
| RN-05 | Obra só atinge status LIBERADO se todos os dados obrigatórios estiverem preenchidos (título, tipo, ao menos uma titularidade com soma = 100%) | Regulamento de Distribuição |
| RN-06 | Domínio Público é marcado via flag manual pelo Analista de Cadastro (sem cálculo automático por data de falecimento) | Simplificação para PoC |
| RN-07 | Um mesmo titular (PF/PJ) pode acumular múltiplos papéis na mesma obra e fonograma (ex: Autor + Intérprete + Produtor + Músico). Cada papel gera uma participação independente com seu respectivo percentual. | Regulamento de Distribuição |
| RN-08 | Valores percentuais devem usar tipos decimais de alta precisão (Decimal/Money). Nunca Float/Double. | Requisito técnico de integridade |
| RN-09 | Todo fonograma deve ter ao menos um Intérprete vinculado. Pode haver múltiplos intérpretes (duetos/feats) — a fatia de 43,7% é rateada entre eles (igualitário por default ou percentual configurável por fonograma). | Regulamento de Distribuição |
| RN-10 | Status FALECIDO do titular é apenas informativo no Cadastro — não impacta regras deste domínio | Simplificação para PoC |
| RN-11 | O papel Editor exige que o titular seja PJ (CNPJ). Autor sem editora recebe 100% da fatia autoral. Quando presente, a divisão padrão é 75% autor / 25% editor, mas os percentuais são livres desde que somem 100%. | Regulamento de Distribuição |
| RN-12 | Arredondamento de percentuais conexos: truncar para 4 casas decimais por participante, calcular diferença entre total original e soma dos truncados, atribuir diferença ao primeiro participante da lista. Garante que a soma fecha exatamente 100% da fatia. | Requisito técnico de integridade |
| RN-13 | Soma dos percentuais de todos os produtores fonográficos deve ser 100% da fatia de produtor. Soma dos percentuais de todos os intérpretes deve ser 100% da fatia de intérprete. | Regulamento de Distribuição |
| RN-14 | Categorias Subeditor e Versionista estão fora do escopo desta PoC | Simplificação para PoC |
| RN-15 | Múltiplos produtores fonográficos no mesmo fonograma: a fatia de 41,7% é rateada por percentual configurável (soma deve ser 100% da fatia de produtor) | Regulamento de Distribuição |

---

## 7. Eventos do Domínio (Domain Events)

### Produz (Publishes)
- `cadastro.obra.liberada` — obra atinge status LIBERADO após validação completa
- `cadastro.obra.bloqueada` — obra bloqueada por pendência ou conflito
- `cadastro.obra.dominio-publico` — obra marcada como Domínio Público
- `cadastro.fonograma.liberado` — fonograma validado e liberado
- `cadastro.titular.criado` — novo titular cadastrado no sistema

### Consome (Subscribes)
Nenhum — o Cadastro é o domínio mais upstream do sistema.

---

## 8. Estratégia de Desenvolvimento (Development Strategy)

### Ordem de Implementação Sugerida
1. **F01 — Seed de Associações** — pré-requisito para vincular titulares
2. **F02 — Gestão de Titulares** — entidade base, independente
3. **F03 — Gestão de Obras Musicais** — depende de F02 para vincular titulares
4. **F04 — Titularidades Autorais** — depende de F02 + F03, implementa RN-01
5. **F05 — Gestão de Fonogramas** — depende de F03, implementa RN-03
6. **F06 — Participação Conexa Automática** — depende de F02 + F05, implementa RN-04
7. **F07 — Controle de Status** — transversal a F03 e F05, implementa RN-05 e RN-06
8. **F08 — Eventos de Cadastro** — transversal, depende de todas as features anteriores

### Riscos do Domínio
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Regra de unicidade simplificada (título + titulares) pode permitir cadastros ambíguos | Baixa | Baixo | Aceitável para PoC; documentado como simplificação |
| Acúmulo de papéis por titular pode gerar edge cases não previstos nos percentuais | Média | Médio | Cobrir cenários "one-man-band" e "produção coletiva" nos testes conforme documentado em modelagem-titular.md |
| Precisão decimal em percentuais conexos (43,7 + 41,7 + 14,6 = 100,0) — arredondamento ao dividir 14,6% entre N músicos | Média | Baixo | Resolvido: algoritmo de alocação de remanescente (truncar 4 casas + diferença no primeiro da lista) — RN-12 |

---

## 9. Questões em Aberto (Open Questions)

- [x] ~~Estratégia de arredondamento~~ → Resolvido: algoritmo de alocação de remanescente (RN-12)
- [x] ~~Múltiplos intérpretes~~ → Resolvido: duetos/feats suportados, fatia rateada (RN-09)
- [x] ~~Editor PJ obrigatório~~ → Resolvido: sim, Editor exige PJ (RN-11)
- [x] ~~Subeditor e Versionista na PoC~~ → Resolvido: ambos fora do escopo (RN-14)
- [x] ~~Múltiplos produtores~~ → Resolvido: percentual configurável, soma = 100% da fatia (RN-15)

Todas as questões foram resolvidas. Domain Doc pronto para geração de PRDs.

---

*Domain Doc gerado com a skill `flow-domain-creator`. Para criar PRDs das features deste domínio, use a skill `flow-prd-creator` fornecendo o `vision.md` e este `domain.md` como contexto.*
