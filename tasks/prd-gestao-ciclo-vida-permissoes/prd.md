# Template de Documento de Requisitos de Produto (PRD)

## Visão Geral

O módulo de Autorização do MCAD já permite consultar permissões cadastradas no `ecad-authz`, visualizar detalhes e depreciar permissões existentes. Hoje, porém, o ciclo de vida da permissão está incompleto: não há fluxo suportado pela aplicação para cadastrar novas permissões, reativar permissões previamente depreciadas nem remover permissões em definitivo de forma governada. Isso força operações manuais, aumenta risco de inconsistência entre APIs, catálogo e papéis, e reduz a rastreabilidade das decisões administrativas.

Esta funcionalidade amplia a gestão de permissões no produto para cobrir todo o ciclo de vida administrativo de uma permissão de negócio. O foco é permitir que administradores globais do `authz` criem permissões seguindo o padrão `dominio:area:recurso:acao`, reativem permissões depreciadas quando uma decisão anterior precisar ser revertida e removam logicamente permissões que já foram aposentadas. A remoção definitiva deve obrigatoriamente passar pelo estado depreciado e só pode acontecer quando a permissão não estiver mais associada a nenhum papel.

O valor de negócio é reduzir dependência de intervenção manual em banco, padronizar a governança do catálogo, preservar trilha de auditoria e evitar que permissões obsoletas continuem ligadas a papéis ativos.

## Objetivos

- Permitir cadastro de permissão pelo módulo de Autorização sem operação manual externa.
- Permitir reativação de permissões depreciadas sem necessidade de recriação com nova chave.
- Permitir remoção lógica definitiva apenas em fluxo controlado: `ATIVA -> DEPRECIADA -> REMOVIDA`.
- Impedir remoção de permissão ainda vinculada a qualquer papel.
- Expor, na tela de detalhe da permissão, os papéis atualmente vinculados para suportar decisão administrativa.
- Garantir auditoria completa das ações de cadastro, depreciação, reativação e remoção.

Indicadores de sucesso:

- 100% das operações comuns de ciclo de vida de permissão passam pela UI/API oficial, sem ajuste manual em banco.
- 0 remoções de permissão sem estado prévio `DEPRECIADA`.
- 0 remoções de permissão ainda associada a papel.
- 100% das ações administrativas relevantes geram evento auditável com ator, alvo e resultado.

## Histórias de Usuário

- Como administrador global de autorização, eu quero cadastrar uma nova permissão para disponibilizá-la no catálogo oficial sem depender de intervenção técnica manual.
- Como administrador global de autorização, eu quero reativar uma permissão depreciada para restaurar uma capacidade de negócio já existente sem criar outra chave.
- Como administrador global de autorização, eu quero remover logicamente uma permissão obsoleta para manter o catálogo limpo e confiável, desde que ela já tenha sido depreciada e não esteja mais vinculada a papéis.
- Como administrador global de autorização, eu quero ver quais papéis estão vinculados a uma permissão para decidir com segurança se posso depreciá-la ou removê-la.
- Como auditor ou responsável por governança, eu quero consultar o histórico dessas ações para comprovar quem alterou o catálogo e em que momento.

Casos extremos relevantes:

- tentativa de cadastrar chave duplicada;
- tentativa de reativar permissão que não está depreciada;
- tentativa de remover permissão ainda ativa;
- tentativa de remover permissão depreciada, mas ainda vinculada a um ou mais papéis;
- tentativa de executar ações sem a permissão administrativa necessária.

## Funcionalidades Principais

### 1. Cadastro de permissão

Permite criar uma nova permissão no catálogo oficial diretamente pelo módulo de Autorização.

Importância: elimina cadastro manual e reduz divergência entre código, seeds e catálogo remoto.

Requisitos funcionais:

1. O sistema deve permitir cadastrar permissão apenas para usuários com privilégio administrativo global de `authz`.
2. O cadastro deve aceitar chave livre no padrão `dominio:area:recurso:acao`.
3. O cadastro deve capturar ao menos: chave, nome de exibição, descrição, domínio, área, recurso e ação.
4. O sistema deve validar unicidade da chave antes de concluir o cadastro.
5. O sistema deve registrar a nova permissão com status inicial `ACTIVE`.
6. O sistema deve exibir erro claro quando a chave violar formato, duplicidade ou regra de autorização.

### 2. Depreciação de permissão

Mantém o fluxo atual de depreciação como etapa obrigatória antes da remoção.

Importância: protege o catálogo contra exclusões precipitadas e formaliza a transição para aposentadoria.

Requisitos funcionais:

7. O sistema deve permitir depreciar uma permissão ativa.
8. O sistema deve impedir depreciação redundante de uma permissão já depreciada ou removida.
9. O detalhe da permissão deve deixar explícito que a depreciação é pré-requisito obrigatório para remoção.

### 3. Reativação de permissão depreciada

Permite desfazer a aposentadoria lógica de uma permissão quando a decisão de descontinuação precisar ser revertida.

Importância: evita recriação de chave e preserva continuidade histórica.

Requisitos funcionais:

10. O sistema deve permitir reativar apenas permissões com status `DEPRECATED`.
11. A reativação deve restaurar o status para `ACTIVE` preservando a mesma chave e identidade da permissão.
12. O sistema deve impedir reativação de permissões já ativas ou já removidas.

### 4. Remoção lógica definitiva

Permite retirar a permissão do catálogo operacional após depreciação e limpeza de vínculos.

Importância: fecha o ciclo de vida da permissão com governança e reduz poluição do catálogo.

Requisitos funcionais:

13. O sistema deve permitir remoção lógica definitiva apenas para permissões com status `DEPRECATED`.
14. O sistema deve impedir remoção de permissão que possua vínculo com qualquer papel.
15. O sistema deve exigir confirmação forte antes da remoção, obrigando o usuário a digitar exatamente `CONFIRMO`.
16. Após a remoção, a permissão deve assumir status lógico final `REMOVED` e não pode voltar a ser reativada por fluxo normal.
17. O sistema deve exibir mensagem clara quando a remoção for bloqueada por vínculo com papéis.

### 5. Visualização de vínculos com papéis

Na tela de detalhe da permissão, o administrador deve conseguir ver os papéis atualmente associados.

Importância: essa visibilidade é necessária para tomada de decisão e para o bloqueio de remoção.

Requisitos funcionais:

18. A tela de detalhe da permissão deve exibir a lista de papéis vinculados, com pelo menos chave do papel, nome de exibição e status.
19. A tela de detalhe deve destacar quando a permissão estiver livre de vínculos e, portanto, elegível para remoção, desde que também esteja depreciada.
20. A solução deve priorizar enriquecimento da tela de detalhe com os endpoints atuais já disponíveis no ecossistema, desde que isso permita identificar com segurança os papéis vinculados à permissão.
21. Se os endpoints atuais não permitirem identificar os vínculos de forma confiável, a disponibilização de endpoint específico no `ecad-authz` deve ser tratada como pré-requisito para a entrega completa da funcionalidade de remoção.

### 6. Auditoria e governança

Todas as operações do ciclo de vida devem ser rastreáveis.

Requisitos funcionais:

22. O sistema deve auditar cadastro, depreciação, reativação e remoção usando o serviço de Auditoria já adotado no sistema, incluindo ator, permissão alvo, ação, data/hora e resultado.
23. O sistema deve registrar tentativas negadas de remoção quando houver bloqueio por status inválido ou vínculo com papéis.
24. O sistema deve aplicar autorização server-side em todas as ações; a UI pode usar permissões apenas para UX.

## Experiência do Usuário

Persona principal: administrador global de autorização, responsável por governança do catálogo e manutenção das permissões utilizadas no ecossistema MCAD.

Fluxo principal esperado:

1. Usuário acessa listagem de permissões.
2. Pode iniciar cadastro de nova permissão.
3. Ao abrir o detalhe de uma permissão, visualiza metadados, status e vínculos com papéis.
4. Se a permissão estiver ativa, pode depreciá-la.
5. Se estiver depreciada, pode reativá-la ou iniciar remoção.
6. Para remover, precisa ver que não há papéis vinculados e digitar `CONFIRMO`.

Diretrizes de UX:

- Estados `ATIVA`, `DEPRECIADA` e `REMOVIDA` devem ser inequívocos.
- A ação de remoção deve ter tratamento visual de risco elevado.
- Mensagens de bloqueio devem explicar a regra de negócio, especialmente quando houver vínculo com papéis.
- A navegação para detalhe deve privilegiar inspeção antes da ação.
- Permissões com status `REMOVED` não devem aparecer na listagem padrão; devem surgir apenas quando o usuário aplicar filtro explícito de status.

Acessibilidade:

- fluxos críticos devem ser utilizáveis por teclado;
- o campo de confirmação deve ser semanticamente associado ao texto explicativo;
- mensagens de erro e sucesso devem ser anunciáveis por tecnologias assistivas;
- contraste e sinalização de estados não podem depender apenas de cor.

## Restrições Técnicas de Alto Nível

- A funcionalidade deve operar sobre o `ecad-authz` como fonte central de catálogo de permissões.
- A autorização para essas operações deve continuar restrita ao administrador global de `authz`.
- O padrão de chave deve permanecer `dominio:area:recurso:acao`.
- Remoção é lógica, não exclusão física do histórico.
- A remoção exige verificação confiável de ausência de vínculos com papéis.
- A solução deve preferir reutilizar endpoints atuais para enriquecer o detalhe da permissão com vínculos a papéis; somente se isso não for possível com segurança deverá ser exigido novo endpoint no `ecad-authz`.
- O comportamento deve preservar trilha de auditoria compatível com exigências de governança.

## Não-Objetivos (Fora de Escopo)

- edição da chave de uma permissão existente;
- operações em lote para cadastro, reativação, depreciação ou remoção;
- versionamento automático de permissões;
- migração automática de papéis impactados por mudança de catálogo;
- exclusão física/irrecuperável de registros históricos;
- redesign completo do módulo de Autorização além do necessário para suportar os novos fluxos.

## Questões em Aberto

- Confirmar, na fase de especificação técnica, se os endpoints atuais do módulo de autorização permitem enriquecer o detalhe da permissão com vínculos a papéis sem ambiguidade ou custo operacional excessivo.
- Definir na especificação técnica como a trilha de auditoria será distribuída entre `ecad-authz`, BFF e serviço de Auditoria, preservando o serviço de Auditoria como fonte governada do histórico.
