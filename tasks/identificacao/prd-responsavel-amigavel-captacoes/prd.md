# PRD — Responsável amigável nas Captações

## Visão Geral

No domínio de **Identificação**, a tela **Identificação › Captações** trata o "Responsável" (o analista dono da captação) de forma pouco amigável em dois pontos:

1. O **filtro "Responsável (ID)"** é um campo de texto livre que exige a digitação do **UUID** do analista. Como o UUID não é um identificador humano, é impossível para o usuário saber qual valor digitar — tornando o filtro inutilizável na prática.
2. Ao **cadastrar uma captação**, a coluna "Responsável" da listagem frequentemente exibe o valor **"Desconhecido"**, em vez do nome do usuário que de fato realizou o cadastro.

O serviço de Identificação **já mantém uma projeção local de usuários** (tabela `usuarios_identidade`), alimentada por eventos de identidade (`identity.user.*`). Essa projeção contém nome de exibição, papéis e situação (ativo/suspenso) e é a fonte de dados ideal para resolver ambos os problemas: alimentar uma combo amigável de responsáveis e resolver o nome correto no momento do cadastro.

O público é o **analista de Identificação** que registra e busca captações no dia a dia.

## Objetivos

- **Eliminar a digitação de UUID** no filtro de Responsável, substituindo-o por uma combo (seleção) com nomes de analistas.
- **Zerar a incidência de "Desconhecido"** na coluna Responsável de captações cuja autoria é conhecida (criadas por usuário autenticado presente na projeção).
- **Corrigir retroativamente** as captações já gravadas como "Desconhecido" quando o responsável puder ser resolvido pela projeção.
- Reaproveitar a projeção local de usuários já existente, sem novas dependências de integração.

Métricas de sucesso:

- 100% das buscas por responsável passíveis de serem feitas por seleção de nome (sem digitação de UUID).
- 0 captações novas exibindo "Responsável: Desconhecido" quando o autor está na projeção.
- Backfill executado: captações históricas com responsável resolvível deixam de exibir "Desconhecido".

## Histórias de Usuário

- **Como** analista de Identificação, **quero** filtrar captações escolhendo o responsável por nome numa combo, **para que** eu não precise descobrir nem digitar um UUID.
- **Como** analista de Identificação, **quero** que minha captação recém-cadastrada apareça com **meu nome** na coluna Responsável, **para que** a autoria fique clara e rastreável.
- **Como** analista de Identificação, **quero** que captações antigas marcadas como "Desconhecido" passem a exibir o responsável correto, **para que** o histórico fique consistente.
- **Caso extremo** — **Como** analista, ao filtrar por um responsável que foi suspenso após criar captações, espero ainda conseguir localizar suas captações (ver Questões em Aberto sobre exibição de suspensos na combo).

## Funcionalidades Principais

### F1 — Combo de Responsável no filtro da listagem

Substitui o campo de texto livre "Responsável (ID)" por uma combo (seleção) de analistas, exibindo o **nome** e enviando ao backend o **identificador** correspondente.

- **Por que importa:** torna o filtro de fato utilizável; remove a barreira do UUID.
- **Como funciona (alto nível):** a combo é populada a partir da projeção local de usuários, restrita a **analistas de Identificação ativos** (não suspensos / não excluídos). A seleção de um item aplica o filtro de responsável já existente na API.

Requisitos funcionais:

1. O filtro "Responsável (ID)" deve ser substituído por uma combo que lista analistas por nome de exibição.
2. A combo deve oferecer uma opção "Todos" (sem filtro), mantendo o comportamento atual de listagem sem restrição de responsável.
3. A combo deve listar **apenas analistas de Identificação ativos** (excluir suspensos e excluídos).
4. A combo deve apresentar os analistas ordenados por nome de exibição.
5. Ao selecionar um analista, a listagem deve filtrar pelas captações daquele responsável; ao selecionar "Todos", o filtro é removido.
6. O sistema deve expor os analistas necessários para popular a combo a partir da projeção local de usuários (sem chamada a serviço externo de identidade em tempo de requisição).
7. Quando a projeção não retornar analistas, a combo deve exibir estado vazio/desabilitado com mensagem clara, sem quebrar a tela.

### F2 — Resolução correta do nome do Responsável no cadastro

Ao cadastrar uma captação, o nome do responsável deve ser o **nome real do usuário autenticado**, e não "Desconhecido".

- **Por que importa:** garante rastreabilidade da autoria e elimina o valor genérico que confunde o usuário.
- **Como funciona (alto nível):** o responsável continua sendo **automaticamente o usuário logado** (sem campo no formulário). O nome passa a ser resolvido pela projeção local de usuários a partir do identificador do autor, com o token (claims) como fonte secundária.

Requisitos funcionais:

8. O responsável de uma nova captação deve continuar sendo, automaticamente, o usuário autenticado que realizou o cadastro (sem seleção manual no formulário).
9. O nome do responsável gravado na captação deve ser resolvido a partir da projeção local de usuários pelo identificador do autor.
10. Caso o autor não seja encontrado na projeção, o sistema deve usar o nome disponível no token; "Desconhecido" só é admissível quando nenhuma fonte fornecer um nome.
11. A coluna "Responsável" da listagem deve exibir o nome resolvido para captações recém-criadas.

### F3 — Backfill de captações com Responsável "Desconhecido"

Correção retroativa das captações já gravadas com responsável "Desconhecido".

- **Por que importa:** limpa o histórico já poluído, evitando que o problema persista nos registros antigos.
- **Como funciona (alto nível):** uma rotina de correção percorre as captações com responsável "Desconhecido" e, quando o identificador do responsável corresponder a um usuário da projeção, atualiza o nome gravado.

Requisitos funcionais:

12. Deve existir uma rotina de backfill que identifique captações cujo nome do responsável é "Desconhecido".
13. Para cada captação encontrada, o nome deve ser atualizado com o valor da projeção **quando o identificador do responsável corresponder** a um usuário conhecido.
14. Captações cujo responsável não possa ser resolvido pela projeção devem permanecer inalteradas (continuam "Desconhecido"), sem erro de execução.
15. O backfill deve ser idempotente (reexecutável sem efeitos colaterais) e registrar quantos registros foram corrigidos.

## Experiência do Usuário

- **Persona primária:** analista de Identificação (cadastra e busca captações).
- **Fluxo de busca:** o analista abre Captações → no painel de filtros, em "Responsável", abre a combo e escolhe um nome (ou "Todos") → a lista atualiza.
- **Fluxo de cadastro:** o analista cria uma captação normalmente → ao retornar à lista, a coluna Responsável mostra o próprio nome do analista.
- **UI/UX:** a combo deve seguir o mesmo padrão visual dos demais seletores da tela de filtros (ex.: filtro de Rubrica/Status já existentes). Rótulo do campo deve deixar de referenciar "ID" (passar a "Responsável").
- **Acessibilidade:** a combo deve ser navegável por teclado, ter rótulo associado e estados de carregamento/vazio perceptíveis; contraste e foco conforme os componentes padrão já usados no projeto.

## Restrições Técnicas de Alto Nível

- **Reuso da projeção existente:** a fonte de usuários é a projeção local `usuarios_identidade` (já alimentada por eventos `identity.user.*`); não introduzir nova integração síncrona com serviço externo de identidade.
- **Compatibilidade de identificador:** existe hoje uma diferença entre como o responsável é identificado na captação e a chave da projeção de usuários — a correspondência entre os dois precisa ser garantida para que combo, cadastro e backfill resolvam o mesmo usuário de forma consistente (detalhe de design a ser tratado na Tech Spec).
- **Sem ruptura de contrato:** o parâmetro de filtro por responsável já existe na API; preferir reutilizá-lo. Qualquer endpoint novo para listar analistas deve respeitar o padrão `/api/v1/...` do projeto.
- **Privacidade/segurança:** a combo expõe nomes de analistas a usuários autorizados da tela de Captações; restringir a listagem ao necessário (analistas ativos) e respeitar a autorização já aplicada à tela.

## Não-Objetivos (Fora de Escopo)

- **Não** será adicionada seleção manual de responsável no formulário de cadastro; o responsável permanece automático (usuário logado).
- **Não** está no escopo permitir **reatribuir** o responsável de uma captação já existente.
- **Não** haverá gestão/CRUD de usuários nesta tela; apenas leitura da projeção para popular a combo.
- **Não** está no escopo alterar regras de permissão de exclusão/edição de captações (continuam baseadas no responsável atual).
- **Não** será criado novo mecanismo de sincronização de usuários além da projeção já existente.

## Questões em Aberto

- **Suspensos na combo:** definiu-se listar apenas analistas **ativos**. Para localizar captações cujo responsável foi suspenso depois, o filtro ainda funciona se o ID for conhecido, mas o nome pode não aparecer na combo — avaliar se é necessário um modo "incluir inativos" na busca.
- **Definição de "analista de Identificação":** confirmar o critério de papel na projeção (`roles`) que caracteriza um analista elegível para a combo.
- **Volume da combo:** confirmar se a lista de analistas é pequena o suficiente para carregamento único, ou se será necessário busca/autocomplete server-side (decisão de Tech Spec conforme o número esperado de analistas).
- **Correspondência de identificador:** confirmar na Tech Spec a estratégia para casar o identificador do responsável (gravado na captação) com a chave da projeção, garantindo que combo, cadastro e backfill apontem para o mesmo usuário.
- **Execução do backfill:** definir o gatilho da rotina (migração/comando único de manutenção vs. tarefa agendada) e onde registrar o resultado.
