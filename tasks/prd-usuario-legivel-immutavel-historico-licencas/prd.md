# PRD — Usuário legível e imutável nos históricos da Arrecadação

## Visão Geral

As telas da **Arrecadação** exibem históricos operacionais, incluindo o **Histórico de Status** no detalhe de Licenças. Hoje o autor das mudanças pode aparecer como um identificador técnico do provedor de identidade, como o `sub`, dificultando leitura, conferência operacional e auditoria por pessoas de negócio.

Esta funcionalidade deve fazer com que novos registros de histórico da Arrecadação exibam um usuário legível para humanos no formato **Nome (login)**, mantendo no armazenamento uma referência imutável ao ator que executou a ação. A solução deve preservar rastreabilidade mesmo que o usuário altere nome, e-mail ou login posteriormente.

O escopo cobre apenas novos registros criados após a entrega. Históricos antigos que já armazenam apenas `sub`, login técnico ou outro valor atual não serão migrados.

## Objetivos

- Exibir nos históricos da Arrecadação um autor compreensível para Analistas e Consultores de Arrecadação.
- Garantir que cada novo item de histórico preserve uma identidade imutável do ator, independente de mudanças futuras no cadastro do IdP.
- Reduzir ambiguidade operacional ao consultar quem executou ações como criar, suspender, reativar, encerrar, inativar, ativar, ajustar ou estornar.
- Reutilizar o mecanismo existente de sincronização de usuários, quando disponível, em vez de depender exclusivamente das claims voláteis do token.

Métricas de sucesso:

- 100% dos novos eventos de histórico da Arrecadação armazenam identificador imutável do ator.
- 100% dos novos eventos exibem um rótulo humano seguindo fallback definido.
- Nenhum histórico antigo é alterado automaticamente.
- As telas continuam carregando histórico mesmo quando a resolução do usuário não encontrar dados sincronizados.

## Histórias de Usuário

- Como **Analista de Arrecadação**, quero ver nos históricos quem executou cada mudança usando nome e login, para identificar rapidamente o responsável por uma ação.
- Como **Consultor de Arrecadação**, quero consultar históricos sem precisar interpretar GUIDs ou identificadores técnicos, para validar o ciclo de vida dos registros com clareza.
- Como **Auditor ou PO**, quero que a identidade armazenada seja imutável, para que registros históricos não mudem retroativamente quando dados do usuário forem alterados.
- Como **Operação**, quero que novos registros funcionem mesmo se a sincronização de usuários estiver atrasada, para que a mudança de status não seja bloqueada indevidamente.

## Funcionalidades Principais

1. **Registro imutável do ator**
   - Cada novo item de histórico da Arrecadação deve armazenar um identificador imutável do usuário autenticado.
   - O identificador imutável deve representar o sujeito do IdP no momento da ação.
   - O valor não deve depender de nome, e-mail ou login, pois estes podem mudar.

2. **Rótulo humano congelado**
   - Cada novo item deve armazenar também um rótulo humano calculado no momento da ação.
   - O rótulo preferencial deve ser exibido no formato **Nome (login)** quando ambos estiverem disponíveis.
   - Quando nome não estiver disponível, deve usar login.
   - Quando login não estiver disponível, deve usar e-mail.
   - Quando nenhum dado humano estiver disponível, deve exibir o identificador técnico como último fallback, sem bloquear a operação.

3. **Indicação de status do usuário**
   - Quando a sincronização indicar que o usuário está suspenso, a UI deve indicar esse estado junto ao autor.
   - Quando a sincronização indicar que o usuário foi removido do IdP, a UI deve indicar esse estado junto ao autor.
   - A indicação de suspenso/removido não deve alterar o rótulo congelado do histórico.

4. **Exibição nos históricos**
   - A tela de detalhe da licença deve exibir o rótulo humano do autor em vez de mostrar apenas `sub` ou GUID.
   - A mesma regra deve ser padronizada para os demais pontos de histórico da Arrecadação, incluindo histórico de status de Usuários de Música, histórico de UDA e registros históricos relacionados a Pagamentos/Estornos quando exibirem autor.
   - A interface deve manter data, transição de status e justificativa como já ocorre.
   - O texto exibido deve ser legível em desktop e mobile, sem truncar informação essencial de forma irreversível.

5. **Busca/resolução de usuários**
   - O produto deve contar com um mecanismo para resolver dados de usuário a partir do identificador imutável.
   - O exploratório do codebase identificou que já existe `identity-sync-api`, que sincroniza usuários do Logto por polling e publica eventos `identity.user.*` no exchange `identity.events`.
   - A Arrecadação já consome esses eventos na fila `arrecadacao.identity.users` e mantém a projeção local `arrecadacao.usuarios_identidade` com `logto_user_id`, `username`, `display_name`, `email`, status e payload bruto.
   - Essa projeção deve ser considerada a fonte preferencial para resolver nome/login no contexto da Arrecadação.

6. **Compatibilidade com históricos existentes**
   - Registros antigos devem continuar sendo exibidos com o valor já existente.
   - Não deve haver backfill obrigatório, enriquecimento retroativo ou alteração automática de dados históricos.
   - O campo legado `autor` pode ser mantido para compatibilidade de API e leitura por consumidores existentes.

## Experiência do Usuário

O usuário acessa uma tela de histórico da Arrecadação, como **Arrecadação → Licenças → Detalhe da licença → Histórico de Status**. Em cada item, o autor deve aparecer em formato humano, por exemplo:

- `Maria Silva (maria.silva)`
- `analista_arrecadacao`
- `analista_arrecadacao@mcad.dev`

Quando aplicável, a UI deve indicar o estado atual conhecido do usuário, por exemplo `Maria Silva (maria.silva) · Suspenso` ou `Maria Silva (maria.silva) · Removido`. O histórico deve continuar ordenado por data decrescente. A mudança não deve adicionar etapas aos fluxos operacionais. O usuário operacional apenas percebe que o campo de autor ficou legível e contextualizado.

Requisitos de acessibilidade:

- O nome exibido deve ser texto selecionável e lido corretamente por tecnologias assistivas.
- Se houver tooltip ou detalhe secundário, ele não pode ser a única forma de acessar a informação.
- O fallback técnico deve ser visível quando não houver rótulo humano, para preservar rastreabilidade.

## Restrições Técnicas de Alto Nível

- A identidade imutável deve ser persistida junto ao novo registro histórico; não basta resolver dinamicamente no momento da leitura.
- O rótulo humano exibido para o histórico deve ser congelado no momento da ação.
- A busca de usuários deve reaproveitar mecanismos existentes sempre que possível: `identity-sync-api`, eventos `identity.user.*` e projeção local `usuarios_identidade`.
- A funcionalidade não deve depender de chamada síncrona ao IdP para cada visualização do histórico.
- A operação de mudança de status não deve falhar somente porque os dados humanos do usuário não foram encontrados.
- Não há restrição de privacidade informada para armazenar nome, login ou e-mail neste contexto.
- O campo `autor` existente pode continuar presente por compatibilidade, mesmo que novos campos sejam adicionados para identidade imutável, rótulo humano e status do usuário.

## Não-Objetivos (Fora de Escopo)

- Migrar ou corrigir históricos antigos.
- Alterar o provedor de identidade, autenticação OIDC ou claims emitidas pelo IdP.
- Implementar gestão de usuários ou papéis.
- Alterar o fluxo funcional de criação, suspensão, reativação ou encerramento de licenças.
- Aplicar a mudança automaticamente a históricos fora do domínio de Arrecadação.
- Substituir a auditoria corporativa existente.

## Questões em Aberto

- Quais telas/endpoints de Arrecadação expõem autor histórico hoje e devem entrar na primeira entrega além de Licenças, Usuários de Música, UDA e Pagamentos/Estornos?
- A indicação de usuário suspenso/removido deve usar texto, badge visual ou ambos?
- O status suspenso/removido exibido deve refletir o estado atual da projeção local ou também ser congelado no momento da ação?
