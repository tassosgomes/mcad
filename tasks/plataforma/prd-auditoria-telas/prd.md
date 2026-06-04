# PRD - Auditoria de telas por criticidade

## Visao Geral

O cliente solicitou uma trilha de auditoria de telas para responder, de forma objetiva, quem acessou qual tela e quais dados estavam potencialmente disponiveis para esse usuario em determinado momento. O objetivo principal e apoiar investigacoes de possivel vazamento de dados, aproximando a resposta de negocio sobre quais usuarios tinham acesso aos dados envolvidos, quando acessaram e, nos casos mais criticos, exatamente o que foi consultado.

A funcionalidade deve classificar telas e operacoes em tres padroes de auditoria:

- **Bronze - baixa criticidade:** audita alteracoes de dados. E o padrao default para a maior parte das telas, especialmente onde nao ha valores financeiros nem dados pessoais/de terceiros sensiveis.
- **Prata - media criticidade:** cobre Bronze e tambem audita acessos de leitura `GET`, registrando metadados do acesso, tela, rota, filtros e contexto de negocio. Deve ser usado em telas com dados pessoais de titulares ou terceiros, onde ha risco de vazamento por simples visualizacao.
- **Ouro - alta criticidade:** cobre Bronze e Prata e salva snapshot do que o usuario consultou, incluindo o conteudo retornado ou uma representacao fiel e auditavel do resultado. Deve ser usado em consultas de alta criticidade, nas quais a investigacao precisa saber exatamente quais dados foram expostos.

A classificacao deve ser consultavel pelo negocio em um catalogo de telas/operações auditadas. O catalogo nao deve ser uma parametrizacao livre e arbitraria em runtime; por seguranca e previsibilidade, a definicao deve ser controlada por produto/compliance e materializada de forma consistente na implementacao.

## Objetivos

- Permitir identificar usuario, tela, rota, data/hora, IP, sessao e contexto de negocio dos acessos auditados.
- Definir uma matriz clara de criticidade Bronze/Prata/Ouro por tela ou operacao.
- Garantir que alteracoes de dados continuem auditadas nas telas Bronze, Prata e Ouro.
- Auditar leituras `GET` em telas Prata e Ouro para apoiar investigacoes de vazamento de dados.
- Salvar snapshot das consultas Ouro para permitir reconstrucao fiel do que foi visualizado.
- Tornar a classificacao de auditoria consultavel por usuarios autorizados de negocio, compliance e auditoria.
- Minimizar captura desnecessaria de dados sensiveis, aplicando o nivel Ouro apenas quando justificado.

## Historias de Usuario

- Como usuario de Compliance, quero consultar quem acessou uma tela sensivel e quando, para investigar possivel exposicao indevida de dados.
- Como auditor, quero saber quais filtros e entidades foram consultados em uma tela Prata, para reduzir o universo de usuarios com possivel acesso a dados vazados.
- Como gestor de negocio, quero consultar a classificacao Bronze/Prata/Ouro de cada tela, para entender quais rastros sao gerados pelo sistema.
- Como responsavel por investigacao de incidente, quero visualizar o snapshot de uma consulta Ouro, para saber exatamente quais dados foram retornados ao usuario.
- Como product owner, quero que telas nao classificadas explicitamente sejam tratadas como Bronze, para evitar excesso de captura por padrao.

## Requisitos Funcionais

### RF-01 - Catalogo de classificacao de auditoria

O sistema deve manter um catalogo consultavel de telas e operacoes classificadas como Bronze, Prata ou Ouro.

**Criterios de aceitacao**

- Given uma tela ou operacao conhecida pelo sistema  
  When um usuario autorizado consultar o catalogo de auditoria  
  Then o sistema deve exibir nome amigavel, identificador tecnico, dominio/modulo, nivel de auditoria e justificativa de classificacao.
- Given uma tela sem classificacao explicita  
  When o sistema precisar aplicar regra de auditoria  
  Then a tela deve ser considerada Bronze.
- Given uma alteracao de classificacao aprovada por produto/compliance  
  When a classificacao for atualizada no catalogo  
  Then a nova regra deve ficar rastreavel por data, responsavel e justificativa.

**MoSCoW:** Must Have

### RF-02 - Auditoria Bronze para alteracoes de dados

Telas Bronze devem auditar operacoes que alteram dados, como criacao, atualizacao, transicao de status, cancelamento, exclusao logica ou acao equivalente.

**Criterios de aceitacao**

- Given um usuario realiza uma alteracao em uma tela Bronze  
  When a operacao for aceita pelo sistema  
  Then um evento auditavel deve registrar usuario, acao, tela, entidade afetada, horario e contexto tecnico minimo.
- Given uma operacao de leitura `GET` em tela Bronze  
  When nao houver alteracao de dados  
  Then o sistema nao deve gerar auditoria de acesso por default.
- Given uma alteracao falha por validacao de negocio  
  When a operacao nao modificar dados  
  Then o sistema nao deve registrar `DATA_CHANGE`, podendo registrar tentativa apenas se houver requisito especifico futuro.

**MoSCoW:** Must Have

### RF-03 - Auditoria Prata para acessos de leitura

Telas Prata devem auditar acessos `GET` alem das alteracoes cobertas pelo Bronze. O evento de leitura deve registrar metadados da consulta, sem salvar snapshot completo da resposta.

**Criterios de aceitacao**

- Given um usuario acessa uma tela Prata  
  When a tela carregar dados via `GET`  
  Then o sistema deve registrar evento de acesso contendo usuario, tela, rota, horario, IP, user agent, parametros/filtros relevantes e contexto de negocio quando disponivel.
- Given uma consulta Prata retorna dados pessoais de titulares ou terceiros  
  When o evento for registrado  
  Then o evento deve permitir identificar a entidade ou conjunto consultado, sem armazenar o conteudo completo retornado.
- Given a mesma tela Prata tambem possui operacoes de alteracao  
  When o usuario alterar dados  
  Then o sistema deve registrar a auditoria de alteracao prevista no nivel Bronze.

**MoSCoW:** Must Have

### RF-04 - Auditoria Ouro com snapshot da consulta

Telas Ouro devem auditar acessos `GET` com snapshot do que foi consultado, preservando uma representacao fiel dos dados retornados ao usuario.

**Criterios de aceitacao**

- Given um usuario executa uma consulta Ouro  
  When a resposta for entregue ao usuario  
  Then o sistema deve registrar evento com metadados da consulta e snapshot do resultado retornado ou representacao equivalente aprovada.
- Given uma consulta Ouro retorna lista paginada ou filtrada  
  When o snapshot for registrado  
  Then ele deve refletir filtros, ordenacao, pagina, limite e itens retornados naquela resposta.
- Given o snapshot contem dados pessoais, financeiros ou de terceiros  
  When ele for armazenado  
  Then o acesso posterior ao snapshot deve ser restrito a usuarios autorizados de auditoria/compliance.
- Given uma tela Ouro possui operacoes de alteracao  
  When o usuario alterar dados  
  Then o sistema deve registrar tambem a auditoria de alteracao prevista no nivel Bronze.

**MoSCoW:** Must Have

### RF-05 - Consulta de eventos para investigacao

Usuarios autorizados devem conseguir consultar eventos de acesso e alteracao por usuario, tela, periodo, entidade/contexto de negocio e nivel de auditoria.

**Criterios de aceitacao**

- Given um auditor possui permissao para consultar auditoria  
  When filtrar por usuario e periodo  
  Then o sistema deve listar eventos auditaveis compatíveis com os filtros.
- Given um evento Prata ou Ouro esta relacionado a uma entidade de negocio  
  When o auditor consultar o detalhe  
  Then o sistema deve exibir a tela, rota, parametros/filtros e identificadores/codigos de negocio disponiveis.
- Given um evento Ouro possui snapshot  
  When um usuario autorizado abrir o detalhe do evento  
  Then o sistema deve exibir o snapshot de forma rastreavel, com horario da consulta e usuario original.

**MoSCoW:** Must Have

### RF-06 - Governanca e minimizacao de dados

A captura de auditoria deve ser proporcional ao risco da tela e deve evitar coleta excessiva.

**Criterios de aceitacao**

- Given uma tela candidata ao nivel Ouro  
  When produto/compliance avaliar a classificacao  
  Then deve existir justificativa documentada para salvar snapshot.
- Given uma consulta Ouro for registrada na primeira versao  
  When o snapshot for armazenado  
  Then nenhum campo do resultado consultado deve ser mascarado.
- Given dados de auditoria foram registrados  
  When forem consultados por usuarios sem permissao adequada  
  Then o sistema deve negar acesso.

**MoSCoW:** Must Have

### RF-07 - Cobertura inicial por dominio

A primeira versao deve classificar as principais telas dos dominios Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria.

**Criterios de aceitacao**

- Given o catalogo inicial for entregue  
  When revisado pelo negocio  
  Then cada tela principal deve possuir nivel Bronze, Prata ou Ouro e justificativa.
- Given telas de Cadastro com dados de titulares forem classificadas  
  When houver exposicao de dados pessoais ou de terceiros  
  Then o nivel minimo esperado deve ser Prata, salvo justificativa aprovada.
- Given telas de Arrecadacao ou Distribuicao exibirem valores financeiros ou creditos de titulares  
  When houver risco relevante de exposicao financeira  
  Then o nivel deve ser Prata ou Ouro, conforme necessidade de snapshot.

**MoSCoW:** Should Have

### RF-08 - Telas Ouro iniciais

A primeira versao deve classificar como Ouro as telas **Cadastro/Titulares**, **Arrecadacao/Pagamentos** e **Arrecadacao/Verbas**.

**Criterios de aceitacao**

- Given a tela Cadastro/Titulares for acessada por um usuario  
  When houver consulta de dados  
  Then o sistema deve registrar auditoria Ouro com snapshot fiel do resultado consultado.
- Given a tela Arrecadacao/Pagamentos for acessada por um usuario  
  When houver consulta de dados  
  Then o sistema deve registrar auditoria Ouro com snapshot fiel do resultado consultado.
- Given a tela Arrecadacao/Verbas for acessada por um usuario  
  When houver consulta de dados  
  Then o sistema deve registrar auditoria Ouro com snapshot fiel do resultado consultado.
- Given uma dessas telas possuir operacoes de alteracao  
  When o usuario alterar dados  
  Then o sistema deve registrar tambem a auditoria de alteracao prevista no nivel Bronze.

**MoSCoW:** Must Have

## Experiencia do Usuario

O usuario de negocio nao deve lidar com termos tecnicos como `screenId`, `entityType` ou payload interno como informacao primaria. A consulta de auditoria deve priorizar nomes amigaveis de telas, dominios, usuarios, datas e codigos de negocio conhecidos. Quando o usuario tiver permissao para visualizar snapshot Ouro, o detalhe deve deixar claro que aquele conteudo representa o resultado de uma consulta feita por outro usuario em data/hora especificas.

O catalogo de classificacao deve ser uma tela ou visao consultavel pela area autorizada, permitindo responder quais telas sao Bronze, Prata ou Ouro e por que. Alterar o catalogo pode exigir fluxo tecnico ou administrado, mas a informacao de classificacao deve ser transparente para quem audita.

## Metricas de Sucesso

- 100% das telas principais classificadas no catalogo inicial.
- 100% das operacoes de alteracao em telas Bronze/Prata/Ouro gerando auditoria de alteracao.
- 100% dos acessos `GET` em telas Prata/Ouro gerando evento de acesso.
- 100% das consultas Ouro com snapshot disponivel para usuarios autorizados.
- Tempo de investigacao reduzido: auditor consegue filtrar por usuario, tela e periodo sem depender de identificadores tecnicos.
- Zero acesso a snapshots Ouro por usuarios sem permissao de auditoria/compliance.

## Restricoes Tecnicas de Alto Nivel

- O MCAD ja possui integracao com servico central de auditoria e eventos `SCREEN_ACCESS`, `USER_ACTION` e `DATA_CHANGE`.
- O frontend React/Vite e o BFF devem preservar contexto de tela, rota, usuario e correlacao entre acesso de tela e comandos posteriores.
- O catalogo deve ser compativel com a tela existente de Auditoria/Acessos e com o PRD `tasks/prd-filtros-auditoria-acessos/prd.md`.
- Snapshots Ouro podem conter dados pessoais, de terceiros e financeiros; devem respeitar permissoes e retencao definidos na Tech Spec.
- A solucao deve evitar parametrizacao livre que permita capturar campos sensiveis sem revisao de produto/compliance.
- Eventos Prata e snapshots Ouro devem ser retidos por **90 dias**.
- Na primeira versao, snapshots Ouro nao devem mascarar dados do resultado consultado; a protecao deve ocorrer por controle de acesso restrito a auditoria/compliance.
- A classificacao do catalogo deve ser alterada via deploy com desenvolvimento, nao por parametrizacao livre em interface administrativa.
- A definicao do ponto autoritativo de captura do snapshot Ouro deve ficar para a Tech Spec, com preferencia inicial por BFF ou backend.

## Nao-Objetivos (Fora de Escopo)

- Substituir o servico central de auditoria.
- Implementar SIEM, deteccao automatica de fraude ou alertas em tempo real.
- Auditar todas as chamadas internas entre servicos que nao resultem de acesso humano a tela.
- Capturar snapshot de todas as telas por default.
- Definir detalhes de banco, payload, compressao, criptografia, indices ou estrategia de armazenamento; isso pertence a Tech Spec.
- Resolver integralmente governanca corporativa de retencao de dados fora do MCAD.

## Riscos e Premissas

- **Risco:** nivel Ouro pode aumentar exposicao de dados sensiveis dentro da propria auditoria. **Mitigacao:** aplicar Ouro apenas com justificativa e permissao restrita.
- **Risco:** parametrizacao dinamica demais pode gerar inconsistencias e captura indevida. **Mitigacao:** catalogo controlado, revisado e rastreavel.
- **Risco:** volume de eventos Prata/Ouro pode crescer rapidamente. **Mitigacao:** definir limites, retencao e armazenamento na Tech Spec.
- **Risco:** snapshots podem divergir do que foi renderizado se a captura ocorrer antes/depois de transformacoes do frontend. **Mitigacao:** definir na Tech Spec o ponto autoritativo de captura.
- **Premissa:** Keycloak e permissoes existentes continuam sendo fonte de autorizacao.
- **Premissa:** Bronze e o default para telas sem classificacao explicita.
- **Premissa:** Prata registra metadados de acesso, nao snapshot completo.
- **Premissa:** Ouro registra snapshot fiel da consulta retornada ao usuario.
- **Premissa:** A retencao inicial de eventos Prata e snapshots Ouro e de 90 dias.
- **Premissa:** A classificacao do catalogo muda via deploy com desenvolvimento.
- **Premissa:** Na primeira versao, snapshots Ouro nao aplicam mascaramento de campos.

## Alternativas Consideradas

- **Auditar todos os `GET` do sistema:** rejeitada por gerar excesso de ruido, custo e exposicao desnecessaria.
- **Aplicar snapshot em todas as telas sensiveis:** rejeitada por ampliar risco de privacidade dentro da propria auditoria.
- **Parametrizacao livre por usuario administrador:** rejeitada nesta fase por risco de erro de classificacao e captura indevida.
- **Apenas auditoria Bronze:** rejeitada por nao atender investigacoes de vazamento, pois leitura de dados sensiveis nao deixaria rastro suficiente.

## Impacto Tecnico de Alto Nivel

A feature exige alinhamento entre frontend, BFF/APIs e servico central de auditoria para propagar contexto de tela, usuario, rota, filtros, entidade de negocio e correlacao entre `SCREEN_ACCESS`, `USER_ACTION` e `DATA_CHANGE`. Telas Prata e Ouro exigem captura sistematica de acessos `GET`. Telas Ouro exigem definicao segura de snapshot, controle de acesso reforcado e possivel revisao de armazenamento/retencao. A Tech Spec deve detalhar contratos, catalogo, eventos, permissao e validacao automatizada de cobertura.

## Rastreabilidade

### Vision Doc

- Atende a restricao global de autenticacao/autorizacao via Keycloak e permissoes de dominio.
- Complementa a preocupacao cross-cutting de Plataforma, especialmente BFF/API Composition, Frontend React/Vite e auditoria central.
- Respeita o non-goal de nao implementar ABAC granular por associacao/tenant; a feature audita acessos, nao redefine autorizacao.
- Usa entidades do glossario com potencial exposicao sensivel: Titular, Obra Musical, Fonograma, Usuario de Musica, Licenca, Verba, Processo de Distribuicao e Credito.

### Domain Docs

- **Cadastro:** telas com Titular, Obra Musical e Fonograma sao candidatas a Prata quando expõem dados pessoais/de terceiros.
- **Identificacao:** telas de Captacao, Execucao e Rol podem exigir Prata quando permitirem rastrear execucoes associadas a obras/fonogramas.
- **Arrecadacao:** telas de Usuario de Musica, Licenca, Pagamento e Verba podem exigir Prata/Ouro por expor dados de terceiros e valores financeiros.
- **Distribuicao:** telas de Processo de Distribuicao, Credito, Credito Retido, Liberacao e Demonstrativo sao candidatas a Prata/Ouro por expor titulares e valores financeiros.

## Questoes em Aberto

1. O snapshot Ouro deve ser capturado no backend, no BFF ou apos transformacao do frontend? Decisao preliminar: BFF ou backend parecem mais seguros; decisao final deve ser feita na Tech Spec.

## Decisoes Fechadas

- Telas Ouro iniciais: Cadastro/Titulares, Arrecadacao/Pagamentos e Arrecadacao/Verbas.
- Retencao inicial de eventos Prata e snapshots Ouro: 90 dias.
- Mascaramento de snapshots Ouro: nenhum campo deve ser mascarado na primeira versao.
- Governanca do catalogo: alteracoes via deploy com desenvolvimento.
