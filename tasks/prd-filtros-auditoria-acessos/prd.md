# PRD - Filtros amigaveis em Auditoria/Acessos

## Visao Geral

A tela **Auditoria / Acessos a telas** permite consultar eventos `SCREEN_ACCESS` registrados no servico central de auditoria. Hoje a experiencia exige conhecimento tecnico: o usuario precisa informar `screenId`, `entityType`, `entityId` e identificadores de usuario em campos de texto livres. Isso dificulta a investigacao por usuarios de negocio, compliance e gestores que precisam auditar acessos sem conhecer nomes internos como `CADASTRO_OBRAS`, `ObraMusical` ou UUIDs.

O ajuste deve transformar os filtros tecnicos em filtros orientados ao negocio. O usuario deve conseguir selecionar logins que ja participaram de alguma auditoria, selecionar telas por nomes amigaveis e filtrar o contexto de negocio por uma categoria compreensivel, como **Cadastro/Obra Musical**, **Cadastro/Fonograma** ou **Arrecadacao/Licenca**, preenchendo apenas o codigo de negocio quando aplicavel.

Exploratorio no codebase: a tela atual esta em `frontend/src/features/auditoria/pages/ScreenAccessPage.tsx`; a chamada esta em `frontend/src/features/auditoria/api/auditoriaApi.ts` via `GET /audit/screen-access`; a documentacao existente em `docs/auditoria-ui-reproducao.md` ainda define `Usuario`, `Tela`, `Entidade` e `ID da entidade` como campos tecnicos. Ja existe um catalogo parcial de tipos em `frontend/src/features/auditoria/constants/auditEntityTypes.ts`, mas ele e voltado para timeline por entidade, nao para filtros amigaveis de acessos.

## Objetivos

- Reduzir dependencia de nomes tecnicos na consulta de acessos a telas.
- Permitir que usuarios de negocio pesquisem acessos por login, tela amigavel e codigo de negocio.
- Evitar filtros que nao fazem sentido para o negocio, especialmente `Entidade` e `ID da entidade` como campos soltos.
- Manter compatibilidade com o servico de auditoria e com os filtros tecnicos existentes, ainda que eles fiquem encapsulados pela interface.
- Melhorar a qualidade da consulta sem expor UUIDs ou identificadores internos desnecessarios.

## Historias de Usuario

- Como usuario de Compliance, quero selecionar um login em uma lista de usuarios auditados para investigar rapidamente acessos realizados por uma pessoa.
- Como gestor de negocio, quero escolher a tela por um nome funcional, como **Cadastro/Obra Musical**, para nao precisar conhecer `screenId` tecnico.
- Como auditor, quero filtrar por uma area/entidade de negocio e informar o codigo conhecido pelo negocio, para localizar acessos relacionados a uma obra, fonograma ou licenca sem usar UUID.
- Como usuario de negocio, quero que campos tecnicos sejam removidos ou traduzidos, para reduzir erro de preenchimento e retrabalho na auditoria.

## Funcionalidades Principais

### RF-01 - Lista de usuarios auditados

A tela deve substituir o campo livre **Usuario** por uma selecao/autocomplete de logins disponiveis.

1. O filtro deve listar apenas usuarios que ja aparecem em eventos de auditoria.
2. Cada opcao deve exibir uma identificacao legivel, priorizando login/username e usando nome ou e-mail quando disponivel.
3. O filtro deve permitir limpar a selecao para consultar acessos de todos os usuarios.
4. O valor tecnico necessario para a API pode continuar sendo enviado internamente, sem aparecer como campo primario para o usuario.

### RF-02 - Combo de telas com nomes amigaveis

A tela deve substituir o campo livre **Tela** por uma combo de telas conhecidas pelo negocio.

1. Cada opcao deve ter label amigavel, por exemplo **Cadastro/Obra Musical**, **Cadastro/Fonograma**, **Arrecadacao/Licenca**, **Identificacao/Captacoes** e **Distribuicao/Processos**.
2. Cada opcao deve mapear internamente para o identificador tecnico esperado pela auditoria, como `CADASTRO_OBRAS` ou `ARRECADACAO_LICENCAS`.
3. A tela selecionada deve continuar sendo filtro obrigatorio se essa obrigatoriedade permanecer no contrato do servico de auditoria.
4. A tabela de resultados deve continuar exibindo o nome amigavel como informacao principal e pode manter o identificador tecnico apenas como detalhe secundario.

### RF-03 - Remocao do filtro tecnico Entidade

O campo **Entidade** deve ser removido da interface de negocio da tela **Auditoria / Acessos**.

1. A interface nao deve exigir que o usuario digite valores como `ObraMusical`, `Fonograma` ou `Licenca`.
2. Quando for necessario enviar `entityType` para a API, o valor deve ser derivado da categoria de negocio selecionada.
3. O usuario nao deve precisar conhecer o modelo interno de eventos da auditoria para filtrar acessos.

### RF-04 - Categoria de negocio + codigo de negocio

O filtro **ID da entidade** deve ser substituido por uma combinacao de categoria amigavel e codigo de negocio.

1. A categoria deve ser uma combo com nomes amigaveis, por exemplo **Cadastro/Fonograma**, **Cadastro/Obra Musical**, **Arrecadacao/Licenca**, **Arrecadacao/Pagamento**, **Identificacao/Captacao** e **Distribuicao/Processo**.
2. Apos selecionar a categoria, o usuario deve poder informar o codigo inteiro de negocio correspondente.
3. O campo de codigo deve deixar claro, pelo label ou placeholder, qual codigo e esperado para a categoria selecionada, como codigo da obra, codigo do fonograma, codigo da licenca ou codigo do processo.
4. Se o servico de auditoria ainda aceitar somente `entityId` tecnico, o produto deve tratar a resolucao do codigo de negocio como dependencia antes de considerar a experiencia completa.

### RF-05 - Periodo e busca

Os filtros **De** e **Ate** devem ser mantidos.

1. A busca deve continuar exigindo periodo valido.
2. O limite padrao de resultados deve permanecer coerente com a experiencia atual, inicialmente 20 registros.
3. Estados de carregamento, erro e vazio devem permanecer claros e acessiveis.

## Experiencia do Usuario

O fluxo principal deve ser: abrir **Auditoria / Acessos**, selecionar opcionalmente um usuario auditado, escolher uma tela amigavel, selecionar o periodo e, se necessario, escolher uma categoria de negocio e informar o codigo conhecido. Ao buscar, a tabela deve mostrar data, usuario, tela, rota, IP e trace, mantendo linguagem de negocio sempre que houver mapeamento disponivel.

A interface deve usar componentes de formulario consistentes com o frontend atual: select para listas pequenas e autocomplete quando a lista puder crescer, especialmente usuarios. Labels devem evitar termos tecnicos. Acessibilidade deve preservar associacao entre label e campo, navegacao por teclado, estado de carregamento perceptivel e mensagens de erro textuais.

## Restricoes Tecnicas de Alto Nivel

- A tela atual consome `GET /audit/screen-access` em `runtimeConfig.auditoriaApiBaseUrl`.
- O contrato documentado hoje aceita `userId`, `screenId`, `entityType`, `entityId`, `fromUtc`, `toUtc` e `limit`.
- Nao ha, no codebase MCAD, endpoint confirmado para listar usuarios distintos, telas distintas ou resolver codigo de negocio para `entityId` tecnico no servico de auditoria.
- Ha risco conhecido de divergencia com o contrato do `ecad-auditoria`, pois revisao anterior registrou que alguns filtros planejados para historico de atribuicoes nao eram suportados pelo endpoint real.
- Dados de auditoria e identificadores de usuario devem respeitar permissoes existentes da area de auditoria e nao ampliar exposicao de dados sensiveis.

## Nao-Objetivos (Fora de Escopo)

- Redesenhar toda a area de Auditoria.
- Alterar a tabela de resultados alem do necessario para exibir nomes amigaveis.
- Criar relatorios PDF novos ou alterar a tela **Relatorios**.
- Substituir o servico central de auditoria.
- Definir detalhes de implementacao de banco, cache ou indices; isso pertence a Tech Spec.

## Questoes em Aberto

1. O servico `ecad-auditoria` ja possui endpoint para listar usuarios que aparecem em eventos auditados? Se nao, esse endpoint entra no escopo?
2. O servico ja possui endpoint para listar `screenId`/`screenName` distintos a partir dos eventos, ou o catalogo de telas deve ser mantido estaticamente no frontend/BFF?
3. Para filtro por codigo de negocio, a auditoria consegue pesquisar pelo codigo no payload, ou sera necessario resolver codigo para UUID/entityId antes da consulta?
4. Qual deve ser a lista inicial oficial de categorias amigaveis? A partir do codebase, candidatos claros sao Cadastro/Obra Musical, Cadastro/Fonograma, Cadastro/Titular, Arrecadacao/Licenca, Arrecadacao/Pagamento, Identificacao/Captacao e Distribuicao/Processo.
5. A tela continua obrigatoria na busca, ou o PO espera permitir consulta apenas por usuario e periodo?
