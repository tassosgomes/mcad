# PRD — ecad-authz como Fonte Única de Associações Usuário/Perfil

> **Domínio:** Plataforma / Cross-cutting  
> **Feature ID:** P-AUTHZ-03  
> **Prioridade:** Fases com peso equivalente para o cutover  
> **Status:** `planned`  
> **Data:** 2026-05-29

---

## Visão Geral

O MCAD já adotou a separação arquitetural correta entre autenticação e autorização: o IdP Logto autentica e emite identidade; o `ecad-authz` autoriza e decide permissões finas. A ADR de autenticação/autorização registra que papéis de negócio devem morar no `ecad-authz`, não no IdP.

A implementação atual ainda mantém uma dependência operacional importante do IdP: o provisionamento do Logto cria roles de negócio, atribui roles a usuários e injeta roles no access token; o `identity-sync-api` replica usuários e roles do Logto; e o `ecad-authz` ainda transforma `roleKeys` vindas do IdP em assignments reais. Na prática, o `ecad-authz` decide, mas o IdP ainda consegue alimentar associações usuário/perfil.

Esta entrega migra o MCAD para um modelo em que o `ecad-authz` é a fonte única de assignments. O Logto permanece responsável por autenticação, sessão, identidade OIDC e emissão de token com audience adequada, mas deixa de carregar papéis de negócio ou de influenciar autorização. O trabalho inclui mudanças de produto, integração, dados, UI, BFF, serviços auxiliares e um ajuste obrigatório no `ecad-authz` para não autoatribuir papéis a partir de roles do IdP.

## Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Eliminar o IdP como fonte direta ou indireta de associação usuário/perfil | Nenhum fluxo operacional cria, altera ou remove assignment de negócio a partir de roles do Logto |
| Tornar o `ecad-authz` a fonte única de assignments | 100% das concessões/revogações de perfil passam por endpoints oficiais do `ecad-authz`, preferencialmente via BFF |
| Preservar acesso dos usuários durante a migração | Zero perda involuntária de acesso após migração validada por comparação antes/depois |
| Remover dependência funcional de roles no JWT | Frontend, BFF e serviços auxiliares não usam roles do token para decisão de autorização ou UX crítica |
| Profissionalizar a gestão de associações | Tela de Atribuições permite buscar usuário, filtrar papéis, atribuir/remover com confirmação, rastreabilidade e feedback de invalidação |
| Reduzir risco de cache/stale permissions | Novo assignment libera acesso sem relogar; remoção revoga após versão/cache em até 5 minutos |

## Histórias de Usuário

- Como **Gestor de Acessos**, eu quero atribuir e remover papéis de usuários por uma tela segura do MCAD, para que a governança de acessos não dependa do console do IdP nem de scripts técnicos.
- Como **Usuário MCAD**, eu quero que minhas permissões efetivas mudem quando meu perfil for alterado no `ecad-authz`, sem precisar relogar, para que a operação reflita decisões administrativas recentes.
- Como **Administrador de Plataforma**, eu quero que o Logto provisione apenas autenticação e recursos OIDC, para que papéis de negócio não fiquem duplicados entre IdP e PDP.
- Como **Auditor**, eu quero rastrear quem atribuiu ou removeu cada papel e qual era o contexto da decisão, para que alterações de acesso sejam defensáveis em auditoria.
- Como **Desenvolvedor de Serviço**, eu quero consultar permissões efetivas no `ecad-authz` ou recebê-las de um gateway confiável, para não reimplementar autorização com roles/scopes do token.

## Funcionalidades Principais

### RF-01 — Sync de identidade sem assignments vindos do IdP

O fluxo de sincronização deve transportar apenas identidade e status do usuário: `sub`, email, nome, status, tipo de usuário e associação quando aplicável. Roles do IdP não devem criar, alterar ou remover assignments no `ecad-authz`.

**Critérios de Aceitação**

1. Dado um evento de identidade com `roleKeys`, quando o sync processar o usuário, então as `roleKeys` são ignoradas para fins de assignment.
2. Dado um usuário novo no Logto, quando a sincronização ocorrer, então o usuário passa a existir no `ecad-authz` sem papéis automaticamente atribuídos.
3. Dado o `ecad-authz` após esta entrega, quando o sync de identidade processar qualquer usuário, então a função de autoatribuição de papéis a partir de roles do IdP não existe mais no fluxo de execução.
4. Dado um evento com roles ignoradas, quando houver observabilidade habilitada, então o sistema registra alerta/metric sem expor dados sensíveis.

### RF-02 — Migração controlada de dados existentes

As roles hoje atribuídas no Logto devem ser exportadas, mapeadas para o catálogo oficial de papéis do `ecad-authz` e convertidas em assignments reais no `ecad-authz`, com ator técnico `migration` e relatório de validação.

**Critérios de Aceitação**

1. Dado o conjunto atual de usuários e roles no Logto, quando a migração for executada, então cada role de negócio reconhecida gera assignment equivalente no `ecad-authz`.
2. Dado uma role sem mapeamento oficial, quando o relatório for gerado, então ela aparece como pendência explícita e não é migrada silenciosamente.
3. Dado o contexto efetivo antes e depois da migração, quando comparado pelos usuários definidos no arquivo `.env_qa` e por perfil crítico, então permissões esperadas permanecem equivalentes.
4. Dado a validação aprovada, quando o cutover avançar, então roles de negócio podem ser removidas do IdP sem perda funcional.

### RF-03 — Provisionamento Logto restrito à autenticação

O provisionamento do Logto deve criar apenas a aplicação SPA, API Resource, configurações OIDC necessárias e usuários de teste. Não deve criar roles de negócio, atribuir roles ou customizar access token com roles.

**Critérios de Aceitação**

1. Dado `scripts/provision-logto.sh`, quando executado em ambiente limpo, então não cria roles de negócio no Logto.
2. Dado um usuário de teste criado pelo provisionamento, quando ele autenticar, então suas permissões de negócio vêm do `ecad-authz`, não do token.
3. Dado a necessidade de fixtures locais, quando usuários de teste precisarem de acesso, então os assignments são criados por seed/fixture do `ecad-authz`, não pelo IdP.

### RF-04 — Gestão de associações no BFF e UI

A tela de Atribuições deve evoluir de uma operação por `userId` para uma experiência administrativa completa, mantendo o BFF como gateway único para o frontend.

**Critérios de Aceitação**

1. O usuário gestor consegue buscar usuários por nome, email ou identificador e selecionar um resultado sem digitar `userId` manualmente.
2. O gestor consegue filtrar papéis por domínio, tipo e status, visualizando descrição, escopo e indicação de papel crítico.
3. O gestor consegue atribuir papel com feedback claro de sucesso, falha e possível tempo de propagação.
4. A remoção exige confirmação explícita, exibindo usuário, papel e impacto esperado.
5. A tela exibe histórico de atribuições/remoções consolidado pelo serviço de Auditoria.
6. O frontend não chama `ecad-authz` diretamente para gestão operacional; todas as ações passam pelo BFF.
7. A experiência atende navegação por teclado, labels acessíveis, estados de carregamento e mensagens compreensíveis para leitores de tela.

### RF-05 — Remoção de roles como base de UX no frontend

O frontend deve trocar decisões baseadas em roles do token por permissões efetivas carregadas de `/api/me` e `/api/me/permissions`.

**Critérios de Aceitação**

1. Dado o callback pós-login, quando o usuário autenticar, então o redirecionamento considera permissões efetivas/contexto do `ecad-authz`, não roles do perfil OIDC.
2. Dado um componente sensível, como acesso a auditoria, quando renderizado, então sua visibilidade depende de permissão efetiva.
3. Dado o cabeçalho ou perfil do usuário, quando exibir "perfil principal", então a informação vem do contexto `ecad-authz`, não do token.
4. Dado código legado que usa `apiAuthzClient` direto no frontend, quando aplicável à gestão operacional, então ele é migrado para wrappers BFF ou restrito a super-admin técnico justificado.

### RF-06 — Serviços auxiliares sem confiança em roles/scopes do JWT

Serviços auxiliares, incluindo o `ai-orchestrator`, não devem aceitar roles/scopes do JWT como autorização de negócio. Eles devem receber permissões resolvidas por um gateway confiável ou consultar contexto no `ecad-authz`.

**Critérios de Aceitação**

1. Dado uma requisição ao `ai-orchestrator`, quando a autorização for avaliada, então roles/scopes do JWT não concedem permissão de negócio.
2. Dado fallback administrativo por role, quando a migração terminar, então o fallback é removido ou substituído por permissão explícita.
3. Dado eventos de auditoria que gravem roles como diagnóstico, quando uma decisão for tomada, então a decisão continua baseada em permissão efetiva.

### RF-07 — Cutover e validação final

O cutover deve remover roles e scope `write` como dependência funcional do token. O token não deve depender de role/roles para autenticação, autorização ou obtenção de audience. A validação deve cobrir negação, concessão dinâmica e revogação.

**Critérios de Aceitação**

1. Usuário sem assignment no `ecad-authz` recebe 403 em APIs protegidas e não vê ações protegidas na UI.
2. Novo assignment no `ecad-authz` libera acesso sem relogar em até 5 minutos, respeitando cache/versionamento.
3. Remoção de assignment revoga acesso em até 5 minutos após expiração/invalidação.
4. Access token sem roles de negócio e sem scope `roles` continua suficiente para autenticação e chamada ao BFF/API com audience válida.
5. Ambientes de desenvolvimento e CI possuem fixtures explícitas de assignments, sem depender de roles do Logto.

## Experiência do Usuário

A área de Acessos deve ser operacional, densa e segura. A tela principal deve priorizar busca de usuário, lista de papéis atuais, ação de atribuir papel e histórico. O gestor precisa entender rapidamente quem é o usuário, quais papéis possui, quais papéis pode receber e qual impacto uma remoção terá. A UX deve evitar termos técnicos como `sub` e `assignmentId` como entrada principal, mas pode exibi-los em detalhes avançados para suporte.

Erros devem diferenciar falta de permissão, usuário inexistente, papel indisponível, conflito de assignment já existente e indisponibilidade temporária do `ecad-authz`. A remoção de papel deve usar confirmação com conteúdo específico, não confirmação genérica.

## Restrições Técnicas de Alto Nível

- Logto permanece o IdP OIDC do MCAD.
- `ecad-authz` é a fonte autoritativa de usuários sincronizados, papéis, assignments, permissões efetivas e versionamento de contexto.
- BFF permanece a fronteira preferencial entre frontend e serviços internos de autorização.
- APIs .NET e Java continuam usando autorização autoritativa por permissão efetiva/PDP externo.
- A solução deve preservar LGPD: logs, relatórios e auditoria não devem vazar documentos, tokens ou dados pessoais desnecessários.
- A mudança no `ecad-authz` para remover permanentemente o autoassignment por role do IdP é parte do escopo funcional deste PRD, ainda que implementada em repositório separado.
- Não há prazo fixo; a sequência deve priorizar validação e rollback seguro.

## Não-Objetivos (Fora de Escopo)

- Substituir o Logto por outro IdP.
- Alterar o protocolo de autenticação OIDC Authorization Code + PKCE.
- Redesenhar o catálogo completo de permissões e papéis de cada domínio.
- Remover o `ecad-authz` ou trocar o PDP externo das APIs.
- Criar gestão de grupos organizacionais complexos fora do modelo atual de assignments.
- Permitir que o frontend opere diretamente contra o `ecad-authz` em fluxos administrativos comuns.

## Premissas e Dependências

- O catálogo atual de roles em `seeds/mcad/roles.json` é a base oficial para mapear roles antigas para papéis do `ecad-authz`.
- O `ecad-authz` expõe endpoints oficiais para listar usuários, listar papéis de usuário, atribuir e remover role.
- O BFF já possui base de rotas para assignments e será evoluído como gateway.
- O cache de `/api/me` e `/api/me/permissions` deve ser versionado ou invalidável o suficiente para refletir concessões e revogações em até 5 minutos.
- A migração será executada em ambiente validável antes da remoção definitiva das roles do IdP.
- Os usuários de validação obrigatória da migração são os definidos no arquivo `.env_qa`.
- O histórico operacional de atribuições e remoções será consolidado via serviço de Auditoria.

## Decisões Fechadas

1. O SLA máximo para propagação de concessão e revogação após mudança de assignment é de 5 minutos.
2. O histórico de atribuições e remoções será consolidado via serviço de Auditoria.
3. Os usuários reais de amostragem obrigatória são os usuários definidos no arquivo `.env_qa`.
4. Role/roles não serão mais necessários no token para autorização nem para audience.
5. Não haverá flag temporária no `ecad-authz`; a função de autoatribuir papéis a partir de roles do IdP deve ser removida permanentemente.

## Questões em Aberto

Nenhuma questão aberta registrada nesta versão do PRD.
