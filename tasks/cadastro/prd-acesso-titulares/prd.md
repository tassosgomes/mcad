# PRD — F11: Acesso de Titulares (Portal do Titular)

> **Domínio:** Cadastro (D01)
> **Feature ID:** F11
> **Prioridade:** Should Have
> **Status:** `prd-ready`
> **Data:** 2026-06-14
> **Contexto:** criado a partir de `vision.md`, `domains/cadastro/domain.md`, `tasks/cadastro/done-prd-gestao-titulares/prd.md`, `tasks/cadastro/done-prd-autenticacao/prd.md` e do estado atual do frontend (`frontend/src/shared/auth/`).

---

## Visão Geral

Com o crescimento do MCAD, os titulares de direitos passaram a demandar autoatendimento: cadastrar e atualizar seus próprios dados de contato (endereço, telefone, e-mail), consultar as obras e fonogramas dos quais são autores ou participantes e reportar erros de cadastro sem depender de um analista.

O sistema atual é operado exclusivamente por usuários internos (Analistas e Consultores autenticados via Keycloak). Não existe um canal direto para o titular, que hoje precisa acionar o ECAD por vias externas para qualquer correção. Esta feature cria o **Portal do Titular** — uma área autônoma, voltada ao público, onde o titular se cadastra, autentica, gerencia seus dados de contato, consulta seu repertório e abre ocorrências.

**Decisão arquitetural central — autenticação própria:** o Portal do Titular usará um **mecanismo de autenticação interno (CPF/CNPJ + senha)**, e não o Keycloak. O motivo é econômico e operacional: titulares são potencialmente muitos e de caráter público; provisionar todos no IDP corporativo é custoso e desnecessário para uma PoC. O login do titular será o seu CPF/CNPJ vinculado a um registro de titular já existente no Cadastro, com senha definida no auto-cadastro. Este mecanismo é **distinto** da autenticação Keycloak/JWT usada pelos usuários internos (feature F10) e não a substitui.

**Problema:** sem autoatendimento, todo ajuste cadastral ou correção de obra/fonograma depende de um analista, gerando gargalo operacional e insatisfação do titular.

**Solução:** um portal autônomo com autenticação própria, onde o titular valida sua identidade contra o cadastro existente, atualiza dados de contato diretamente, solicita alterações de dados sensíveis para aprovação, consulta seu repertório e abre ocorrências rastreáveis.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Habilitar autoatendimento do titular | Titular consegue se cadastrar, autenticar e atualizar dados de contato sem intervenção do analista |
| Reduzir gargalo operacional | ≥ 60% das correções de dados de contato resolvidas pelo próprio titular, sem abrir chamado |
| Rastrear correções reportadas | 100% das ocorrências abertas têm status visível ao titular (ABERTA → EM_ANALISE → RESOLVIDA/CANCELADA) |
| Preservar integridade do cadastro | Alterações em dados sensíveis só são aplicadas após aprovação do Analista de Cadastro |
| Garantir segurança e LGPD | Senhas armazenadas com hash; dados sensíveis (CPF/CNPJ) tratados conforme LGPD; sem credenciais em texto plano |
| Manter isolamento de contextos | Portal lê/escreve apenas no domínio Cadastro; sem JOIN cross-schema nem acoplamento com Distribuição |

---

## Histórias de Usuário

### HU-01 — Auto-cadastro no Portal
**Como** titular de direitos,
**eu quero** me cadastrar no portal informando meu CPF/CNPJ e criando uma senha,
**para que** eu tenha acesso a uma área exclusiva para gerenciar meus dados.

### HU-02 — Autenticar no Portal
**Como** titular cadastrado,
**eu quero** entrar no portal com meu CPF/CNPJ e senha,
**para que** eu acesse minhas informações de forma segura e exclusiva.

### HU-03 — Atualizar meus dados de contato
**Como** titular autenticado,
**eu quero** editar meu endereço, telefone e e-mail de contato diretamente,
**para que** meu cadastro esteja sempre atualizado sem depender de um analista.

### HU-04 — Solicitar alteração de dado sensível
**Como** titular autenticado,
**eu quero** solicitar a correção de dados sensíveis (ex: nome, CAE/IPI, associação vinculada),
**para que** o ECAD revise e aplique a alteração quando procedente.

### HU-05 — Consultar minhas obras e fonogramas
**Como** titular autenticado,
**eu quero** visualizar as obras e fonogramas dos quais sou autor ou participante,
**para que** eu conheça meu repertório cadastrado.

### HU-06 — Reportar erro de cadastro (abrir ocorrência)
**Como** titular autenticado,
**eu quero** abrir uma ocorrência relatando um erro no cadastro de uma obra ou fonograma meu,
**para que** o ECAD investigue e corrija o problema.

### HU-07 — Acompanhar minhas ocorrências
**Como** titular,
**eu quero** ver o status das minhas ocorrências,
**para que** eu saiba se estão sendo tratadas e qual o resultado.

### HU-08 — Triar e resolver ocorrências
**Como** Analista de Cadastro,
**eu quero** ver as ocorrências abertas e progredi-las entre estados,
**para que** eu investigue, resolva ou cancele cada caso de forma rastreável.

### HU-09 — Aprovar alteração de dado sensível
**Como** Analista de Cadastro,
**eu quero** revisar e aprovar/rejeitar solicitações de alteração de dados sensíveis,
**para que** o cadastro seja alterado de forma controlada e auditável.

---

## Funcionalidades Principais

### 1. Auto-cadastro e Autenticação do Titular

O titular cria suas credenciais no portal, vinculando-as ao seu registro já existente no Cadastro. A autenticação é interna (CPF/CNPJ + senha) e **não** usa o Keycloak.

**Premissas:**
- O titular já deve existir no Cadastro (criado pelo Analista), com CPF/CNPJ e CAE/IPI válidos.
- O login (identificador único) é o CPF/CNPJ.
- A senha é definida no auto-cadastro e armazenada apenas como hash.
- Esta autenticação é independente da autenticação Keycloak dos usuários internos (F10).

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve permitir auto-cadastro informando CPF/CNPJ, CAE/IPI e uma senha | Must Have |
| RF-02 | O auto-cadastro deve validar que o CPF/CNPJ + CAE/IPI correspondem a um titular existente e ativo no Cadastro | Must Have |
| RF-03 | Não deve ser permitido criar mais de uma conta para o mesmo CPF/CNPJ | Must Have |
| RF-04 | A senha deve ser armazenada exclusivamente como hash com algoritmo adequado (detalhes na Tech Spec); nunca em texto plano | Must Have |
| RF-05 | O sistema deve autenticar o titular por CPF/CNPJ + senha e emitir uma credencial de sessão para o portal | Must Have |
| RF-06 | Credenciais inválidas não devem revelar qual campo está incorreto (mensagem genérica) | Must Have |
| RF-07 | O sistema deve permitir ao titular alterar a própria senha quando autenticado | Should Have |
| RF-08 | O sistema deve permitir recuperação de senha via fluxo de redefinição (escopo mínimo definido na Tech Spec) | Could Have |

**Critérios de Aceitação — RF-01 + RF-02:**
- **Given** existe o titular "João" com CPF `123.456.789-00` e CAE/IPI `000.000.00.00`
- **When** João se cadastra informando CPF, CAE/IPI e senha
- **Then** a conta é criada vinculada ao titular "João"
- **And** ele consegue autenticar em seguida

**Critérios de Aceitação — RF-02 (validação falha):**
- **Given** não existe titular com o CPF/CNPJ informado
- **When** o titular tenta o auto-cadastro
- **Then** o cadastro é recusado com mensagem orientando procurar o ECAD
- **And** nenhuma conta é criada

**Critérios de Aceitação — RF-04:**
- **Given** o titular define a senha `minhaSenha123`
- **When** a credencial é persistida
- **Then** apenas o hash da senha é armazenado
- **And** a senha original não é recuperável

### 2. Gestão de Dados de Contato (Edição Direta)

O titular atualiza diretamente os campos de contato: endereço, telefone e e-mail de contato. Esses campos são considerados de baixo risco e não exigem aprovação.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-09 | O titular autenticado deve poder editar seu endereço, telefone e e-mail de contato | Must Have |
| RF-10 | A alteração de contato deve ser aplicada imediatamente no cadastro e refletida em consultas subsequentes | Must Have |
| RF-11 | O sistema deve validar formato de e-mail e telefone antes de persistir | Must Have |
| RF-12 | Cada alteração de contato deve registrar autor (o próprio titular), data e valor anterior para auditoria | Must Have |
| RF-13 | O sistema deve publicar um evento `cadastro.titular.contato.atualizado` via Outbox quando dados de contato forem alterados | Should Have |

**Critérios de Aceitação — RF-09 + RF-10:**
- **Given** o titular autenticado altera seu e-mail de `a@x.com` para `b@x.com`
- **When** a alteração é confirmada
- **Then** o cadastro passa a exibir `b@x.com`
- **And** a alteração fica registrada na auditoria com valor anterior

### 3. Solicitação de Alteração de Dados Sensíveis (Aprovação)

Dados sensíveis (ex: nome, CAE/IPI, associação vinculada, categoria de titular) não podem ser editados diretamente pelo titular. O titular abre uma **solicitação de alteração** que um Analista de Cadastro aprova ou rejeita.

> **Regra de integridade — vínculo de associação:** o vínculo do titular com uma associação pode ser **alterado** (de uma associação para outra), mas **nunca removido** (nunca pode ficar em branco). Esta regra protege a consistência da Distribuição: a retenção por `TITULAR_SEM_ASSOCIACAO` é um cheque binário (`hasText(associacaoSigla)`), portanto trocar UBC→ABRAMUS não altera o status de retenção — apenas uma remoção (passar a vazio) causaria inconsistência. Ver seção *Questões Resolvidas* para a análise completa.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | O titular deve poder abrir uma solicitação de alteração informando o campo desejado, o valor pretendido e uma justificativa | Must Have |
| RF-15 | A solicitação deve nascer no estado `SOLICITADA` e transitar para `APROVADA` ou `REJEITADA` pelo Analista | Must Have |
| RF-16 | A alteração do dado sensível só deve ser aplicada ao cadastro quando a solicitação for `APROVADA` | Must Have |
| RF-17 | O titular deve poder visualizar o status das suas solicitações (`SOLICITADA`/`APROVADA`/`REJEITADA`) | Must Have |
| RF-18 | Ao aprovar, o sistema deve registrar quem aprovou, quando, o valor anterior e o novo valor | Must Have |
| RF-19 | Solicitações rejeitadas devem registrar a justificativa da rejeição fornecida pelo Analista | Should Have |
| RF-20 | Uma solicitação de alteração de associação deve sempre indicar uma associação de destino válida; o sistema deve recusar qualquer tentativa de remover o vínculo (deixar em branco) | Must Have |
| RF-21 | Ao solicitar alteração de associação, o sistema deve exibir aviso informativo de que, durante a janela de processamento da Distribuição, a alteração surtirá efeito apenas no próximo processamento (o processo em curso usa a fotografia do cadastro no momento do cálculo) | Should Have |

**Critérios de Aceitação — RF-16:**
- **Given** o titular solicita alterar seu nome de "João" para "João Silva"
- **When** o Analista aprova
- **Then** o nome do titular passa a ser "João Silva"
- **And** a auditoria registra valor anterior, novo valor, autor e data

**Critérios de Aceitação — RF-20 (proibição de remoção de associação):**
- **Given** o titular possui associação "UBC"
- **When** ele tenta solicitar a "remoção" da associação (sem informar destino)
- **Then** a solicitação é recusada com mensagem orientando que o vínculo só pode ser alterado para outra associação, nunca removido
- **And** nenhuma solicitação `SOLICITADA` é criada

**Critérios de Aceitação — RF-21 (aviso de janela de processamento):**
- **Given** o titular está solicitando a alteração de associação de "UBC" para "ABRAMUS"
- **When** o formulário de solicitação é exibido
- **Then** é apresentado um aviso informativo: "Se houver distribuição em curso, esta alteração será considerada apenas no próximo processamento"
- **And** o titular pode prosseguir com a solicitação (o aviso não bloqueia)

### 4. Consulta de Obras e Fonogramas do Titular

O titular visualiza, em modo somente leitura, as obras e fonogramas dos quais é autor ou participante (titular autoral ou conexo).

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-22 | O sistema deve listar as obras em que o titular possui titularidade autoral, com título, categoria, ISWC (quando houver) e percentual | Must Have |
| RF-23 | O sistema deve listar os fonogramas em que o titular é participante conexo, com título da obra, ISRC e papel/percentual | Must Have |
| RF-24 | A consulta deve ser restrita ao titular autenticado; um titular não pode ver dados de outro titular | Must Have |
| RF-25 | A listagem deve ser somente leitura; o titular não edita titularidades nem percentuais nesta feature | Must Have |
| RF-26 | O sistema deve permitir filtrar por obra ou fonograma e ordenar por título | Should Have |

**Critérios de Aceitação — RF-24:**
- **Given** os titulares "João" e "Maria" estão autenticados
- **When** João consulta suas obras
- **Then** apenas obras onde João é titular são retornadas
- **And** Maria não consegue acessar as obras de João por nenhum endpoint

### 5. Abertura e Acompanhamento de Ocorrências

O titular registra uma ocorrência ao identificar um erro no cadastro de obra ou fonograma. O ciclo de vida é simples: `ABERTA → EM_ANALISE → RESOLVIDA / CANCELADA`.

**Campos principais da Ocorrência:**

| Campo | Descrição |
|-------|-----------|
| `id` | Identificador da ocorrência |
| `titularId` | Titular que abriu a ocorrência |
| `tipo` | Categoria do erro (ex: titularidade divergente, fonograma incorreto, dado cadastral errado, obra ausente) |
| `obraId` / `fonogramaId` | Obra ou fonograma referenciado, quando aplicável |
| `descricao` | Descrição livre do erro relatado |
| `status` | `ABERTA` / `EM_ANALISE` / `RESOLVIDA` / `CANCELADA` |
| `resolucao` | Parecer/resolução registrada pelo Analista |
| `abertaEm` / `resolvidaEm` | Timestamps do ciclo |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-27 | O titular deve poder abrir uma ocorrência informando tipo, obra/fonograma referenciado (quando aplicável) e descrição | Must Have |
| RF-28 | A ocorrência deve nascer no estado `ABERTA` | Must Have |
| RF-29 | O titular deve poder listar e filtrar suas próprias ocorrências por status | Must Have |
| RF-30 | O titular deve ver o status atual e a resolução (quando houver) de cada ocorrência | Must Have |
| RF-31 | Um titular não pode ver ocorrências de outros titulares | Must Have |
| RF-32 | O sistema deve publicar `cadastro.ocorrencia.aberta` via Outbox quando uma ocorrência é criada | Should Have |

**Critérios de Aceitação — RF-27 + RF-28:**
- **Given** o titular autenticado identificou um erro na obra "Song X"
- **When** ele abre uma ocorrência com tipo "titularidade divergente" e descrição
- **Then** a ocorrência é criada no estado `ABERTA`
- **And** fica visível na lista de ocorrências do titular

### 6. Triagem e Resolução de Ocorrências pelo Analista

O Analista de Cadastro visualiza as ocorrências abertas por todos os titulares, assume a análise, investiga e resolve ou cancela cada caso.

**Estados da Ocorrência:**

```
ABERTA -> EM_ANALISE -> RESOLVIDA
               |
               v
           CANCELADA
```

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-33 | O Analista deve poder listar todas as ocorrências com filtros por status, titular e tipo | Must Have |
| RF-34 | O Analista deve poder mover uma ocorrência de `ABERTA` para `EM_ANALISE` | Must Have |
| RF-35 | O Analista deve poder mover uma ocorrência de `EM_ANALISE` para `RESOLVIDA`, registrando a resolução | Must Have |
| RF-36 | O Analista deve poder cancelar uma ocorrência (`CANCELADA`) com justificativa | Must Have |
| RF-37 | O sistema deve impedir transições inválidas de estado (ex: `RESOLVIDA` → `ABERTA`) | Must Have |
| RF-38 | Cada transição de estado deve registrar autor, data e motivo | Must Have |
| RF-39 | O sistema deve publicar `cadastro.ocorrencia.resolvida` via Outbox quando uma ocorrência é resolvida | Should Have |

**Critérios de Aceitação — RF-35:**
- **Given** a ocorrência OC-1 está `EM_ANALISE`
- **When** o Analista a resolve com a resolução "titularidade corrigida"
- **Then** a ocorrência fica `RESOLVIDA`
- **And** o titular passa a ver o status `RESOLVIDA` e a resolução

---

## Experiência do Usuário

### Fluxo Principal — Auto-cadastro e Primeiro Acesso
1. Titular acessa o Portal do Titular e clica em "Criar conta"
2. Informa CPF/CNPJ, CAE/IPI e define uma senha
3. O sistema valida contra o cadastro existente e cria a conta
4. Titular autentica com CPF/CNPJ + senha e acessa sua área

### Fluxo — Atualização de Contato
1. Titular autenticado acessa "Meus dados de contato"
2. Edita endereço, telefone e/ou e-mail
3. O sistema valida formatos e aplica a alteração imediatamente
4. A auditoria registra a mudança com valor anterior

### Fluxo — Solicitação de Dado Sensível
1. Titular acessa "Solicitar alteração de dado sensível"
2. Informa o campo, o valor desejado e a justificativa
3. Se o campo for **associação**, o sistema exige associação de destino válida (nunca remoção) e exibe aviso de que a alteração só vale para o próximo processamento de distribuição
4. A solicitação fica `SOLICITADA`
5. Analista de Cadastro revisa no painel interno e aprova/rejeita
6. Se aprovada, o dado é alterado; o titular vê o status atualizado

### Fluxo — Abrir e Acompanhar Ocorrência
1. Titular identifica um erro ao consultar suas obras/fonogramas
2. Clica em "Reportar erro" na obra/fonograma (ou via menu de ocorrências)
3. Informa o tipo e a descrição
4. A ocorrência fica `ABERTA`
5. Titular acompanha o status na lista de ocorrências até `RESOLVIDA` ou `CANCELADA`

### Considerações de UI
- O Portal do Titular é uma área distinta da área interna (BFF/SPA atual). A Tech Spec definirá se é uma rota/seção isolada no frontend existente ou um SPA separado, com provedor de autenticação próprio (não-OIDC).
- A área do titular nunca expõe endpoints internos de escrita do analista; endpoints são separados e escopados à identidade do titular.
- Mensagens de erro de login devem ser genéricas (não revelar se CPF ou senha está incorreto).
- Badges de status de ocorrência: `ABERTA`, `EM_ANALISE`, `RESOLVIDA`, `CANCELADA`.
- Acessibilidade: seguir o DESIGN.md existente; contraste, navegação por teclado e rótulos ARIA nos formulários.

---

## Restrições Técnicas de Alto Nível

- **Autenticação própria:** o Portal do Titular usa login interno por CPF/CNPJ + senha, **distinto e independente** do Keycloak/OIDC usado pelos usuários internos (F10). A Tech Spec define o formato da credencial de sessão (JWT assinado pelo serviço, etc.).
- **Segurança de senhas:** armazenamento obrigatoriamente via hash com sal e algoritmo moderno (ex: Argon2/bcrypt — definição exata na Tech Spec). Sem texto plano, sem log de senha.
- **Vinculação de identidade:** o auto-cadastro exige correspondência CPF/CNPJ + CAE/IPI com um titular pré-existente no Cadastro. Não há criação de titular pelo portal.
- **Isolamento de dados:** o titular acessa exclusivamente dados próprios; a camada de aplicação deve filtrar por `titularId` obtido da credencial autenticada.
- **Stack:** serviço `cadastro-api` (.NET 8 Minimal API) e/ou BFF para composição; dados no schema `cadastro`; frontend React + Vite.
- **LGPD:** CPF/CNPJ e dados de contato são dados pessoais; o sistema deve tratar conforme as diretrizes globais de sanitização em logs e auditoria (ver `dotnet-production-readiness`).
- **Eventos:** seguir CloudEvents 1.0 via Outbox Pattern já existente no domínio Cadastro.
- **Authz:** endpoints do analista (triagem, aprovação) continuam protegidos por `authz-spring-boot-starter`/equivalente .NET com `@RequiresPermission`/atributo de permissão. Endpoints do titular são protegidos pela credencial de sessão do próprio titular.
- **Sem acoplamento com Distribuição:** este PRD não introduz dependência da Distribuição; créditos e demonstrativos permanecem fora de escopo.

---

## Permissionamento (ecad-authz)

Os endpoints do **titular** não usam o modelo de roles/permissões interno (eles são autenticados pela credencial do titular, não pelo Keycloak). Apenas os endpoints de **Analista** (triagem de ocorrências e aprovação de alterações sensíveis) seguem a convenção de 4 segmentos `dominio:area:recurso:acao`.

| key | name | Endpoint(s) | Perfil-base sugerido |
|---|---|---|---|
| `cadastro:default:ocorrencia:listar` | Listar ocorrências (todas) | `GET /ocorrencias` (painel analista) | consultor, analista |
| `cadastro:default:ocorrencia:visualizar` | Visualizar ocorrência | `GET /ocorrencias/{id}` (painel analista) | consultor, analista |
| `cadastro:default:ocorrencia:analisar` | Mover para EM_ANALISE | `POST /ocorrencias/{id}/analisar` | analista |
| `cadastro:default:ocorrencia:resolver` | Resolver ocorrência | `POST /ocorrencias/{id}/resolver` | analista |
| `cadastro:default:ocorrencia:cancelar` | Cancelar ocorrência | `POST /ocorrencias/{id}/cancelar` | analista |
| `cadastro:default:solicitacao-alteracao:listar` | Listar solicitações de alteração | `GET /solicitacoes-alteracao` | consultor, analista |
| `cadastro:default:solicitacao-alteracao:aprovar` | Aprovar alteração sensível | `POST /solicitacoes-alteracao/{id}/aprovar` | analista |
| `cadastro:default:solicitacao-alteracao:rejeitar` | Rejeitar alteração sensível | `POST /solicitacoes-alteracao/{id}/rejeitar` | analista |

A proteção real é no backend. O frontend esconde telas/ações conforme permissões recebidas do BFF (ADR 0004).

---

## Não-Objetivos (Fora de Escopo)

- **Edição de titularidades/percentuais pelo titular** — continua sob controle exclusivo do Analista de Cadastro.
- **Cadastro de novas obras/fonogramas pelo titular** — o titular apenas consulta e reporta erros.
- **Pagamento/saque de créditos** — fora da PoC (non-goal global).
- **App mobile** — apenas portal web (SPA).
- **Notificações por e-mail/push** — sem sistema de notificações assíncronas ao titular neste PRD.
- **Substituir a autenticação Keycloak dos usuários internos** — a auth própria aplica-se apenas ao titular.
- **Visualização de créditos/demonstrativo de distribuição (F07)** — fora de escopo; será tratado pela feature de demonstrativo.
- **Múltiplas contas por titular** ou conta compartilhada entre titulares.
- **Integração com sistemas externos** (ABRAMUS, UBC, etc.) — sistema auto-contido.
- **SLA, priorização e escalonamento de ocorrências** — o workflow é simples (sem SLA nesta PoC).
- *(Nota: riscos de implementação técnica serão detalhados na Tech Spec.)*

---

## Rastreabilidade

### Vision Doc
- **Fase:** extensão da Fase 1 — Cadastro (autoatendimento ao titular)
- **Glossário:** Titular Autoral, Titular Conexo, Titularidade, Obra Musical, Fonograma, CAE/IPI, Associação
- **Restrição global:** Schema-per-Service, Event-Driven (Outbox), PoC auto-contida, LGPD
- **Simplificação:** sem integração externa; sem pagamento real; sem app mobile

### Domain Doc (Cadastro — D01)
- **Feature:** F11 — Acesso de Titulares (Portal do Titular)
- **Entidades novas:** CredencialTitular (auth), SolicitacaoAlteracao, Ocorrencia
- **Dependência interna:** F04 (gestao-titulares) — o titular já existe e tem CPF/CNPJ + CAE/IPI; F10 (autenticacao) — mantida para usuários internos, paralela à auth do titular
- **Eventos produzidos (sugeridos):** `cadastro.titular.contato.atualizado`, `cadastro.ocorrencia.aberta`, `cadastro.ocorrencia.resolvida`
- **Sem dependência de Distribuição neste PRD**

---

## Questões Resolvidas

| Questão | Decisão |
|---------|---------|
| A alteração de associação pelo titular durante a janela de distribuição causa inconsistência? | **Parcialmente mitigada por regra de produto.** A retenção por `TITULAR_SEM_ASSOCIACAO` é um cheque binário em `hasText(associacaoSigla)` (em `CalculadoraCreditos` e `CreditoRetidoLiberacaoService`). Logo, trocar UBC→ABRAMUS **não altera** o status de retenção. O único cenário perigoso seria **remover** o vínculo (passar a vazio), o que faria um crédito já calculado como `LIBERADO` ficar baseado em dado obsoleto — e F05 só reavalia retidos para liberar, nunca para re-reter. **Decisão: o vínculo de associação pode ser alterado, mas jamais removido (RF-20).** Além disso, exibe-se aviso informativo de que a alteração só vale para o próximo processamento (RF-21), pois o processo em curso usa o snapshot do cadastro no momento do cálculo. |
| A correção estrutural do "lock de cadastro durante distribuição" entra neste PRD? | **Não.** Pertence à Distribuição (F05 reavaliar nos dois sentidos, ou um mecanismo de lock de cadastro análogo ao lock de verba da Arrecadação). O Cadastro não pode depender da Distribuição (inverteria a direção de dependência). O Portal apenas impõe a regra de não-remoção e o aviso informativo. |

---

## Questões em Aberto

| # | Questão | Impacto |
|---|---------|---------|
| Q-01 | O Portal do Titular será uma rota/seção isolada no frontend existente (mesmo Vite app, outro AuthProvider) ou um SPA separado? | Estrutura de frontend; deployment |
| Q-02 | Formato da credencial de sessão do titular (JWT assinado pelo serviço? cookie de sessão?) e tempo de expiração | Arquitetura de auth; segurança |
| Q-03 | Recuperação de senha: qual fluxo mínimo viável na PoC (e-mail com link, perguntas de segurança, reset pelo analista)? | Escopo; experiência |
| Q-04 | A entidade CredencialTitular (senha hash) deve residir no schema `cadastro` ou num schema/módulo de auth isolado? | Isolamento de dados sensíveis |
| Q-05 | A consulta de obras/fonogramas do titular será feita via BFF (API Composition) ou diretamente no serviço Cadastro com filtro por titularId? | Arquitetura de integração |
| Q-06 | O evento `cadastro.titular.contato.atualizado` deve ser consumido por algum domínio hoje (Analytics, Distribuição)? | Contrato de eventos |
| Q-07 | Há necessidade de limitar tentativas de login (rate limit / lockout) para mitigar brute-force? | Segurança |

PRD pronto para Tech Spec.

---

*PRD gerado seguindo a skill `ai-prd-creator`. Para gerar a Especificação Técnica, use este PRD junto com `vision.md` e `domains/cadastro/domain.md` como contexto.*
