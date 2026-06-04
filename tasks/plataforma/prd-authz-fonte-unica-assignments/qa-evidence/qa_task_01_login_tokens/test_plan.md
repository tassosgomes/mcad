CASOS DE TESTE - Login OIDC e tokens sem roles
===============================================

Contexto:
- Task: qa_task_01_login_tokens_env_qa
- Ambiente: https://mcad.tasso.dev.br
- Autenticacao: OIDC Logto via UI
- Banco de dados: nao aplicavel para esta task
- Fonte de credenciais: .env_qa, lida apenas em memoria; senhas e tokens nao devem ser gravados.

CT-01: Login OIDC pela UI para cada usuario .env_qa
  Pre-condicao:
    - Usuario existe no Logto do ambiente QA.
    - Aplicacao implantada em https://mcad.tasso.dev.br.
  Passos:
    1. Abrir uma sessao de browser isolada.
    2. Acessar a raiz da aplicacao.
    3. Confirmar redirecionamento para Logto.
    4. Preencher username e senha do usuario atual.
    5. Submeter o formulario de login.
    6. Aguardar retorno para a aplicacao.
  Expected:
    - Login conclui sem erro.
    - Browser retorna para https://mcad.tasso.dev.br.
    - A aplicacao sai da rota /callback e renderiza uma pagina autenticada ou fallback autenticado de acesso negado.
  Tipo: UI

CT-02: Access token sem claims de roles de negocio
  Pre-condicao:
    - CT-01 concluiu com token OIDC de acesso capturado em memoria.
  Passos:
    1. Capturar o access token gerado durante o fluxo OIDC sem grava-lo em disco.
    2. Decodificar o payload JWT em memoria.
    3. Verificar claims top-level role e roles.
    4. Verificar o claim scope/scp.
  Expected:
    - Access token e um JWT decodificavel.
    - Payload nao contem claim top-level roles.
    - Payload nao contem claim top-level role.
    - scope/scp nao contem o escopo roles.
  Tipo: UI/OIDC

CT-03: Evidencias sanitizadas por usuario
  Pre-condicao:
    - CT-01 e CT-02 executados ou falha registrada.
  Passos:
    1. Salvar screenshot da tela de login.
    2. Salvar screenshot do estado final ou da falha.
    3. Registrar console do browser, requests relevantes e resumo de claims.
  Expected:
    - Evidencias nao contem senha, access token, id token, refresh token, codigo OAuth ou header Authorization.
    - O relatorio lista email/username, status e checks executados por usuario.
  Tipo: UI/Relatorio

Usuarios no escopo:
- consultor.dev@mcad.local / consultor_dev
- operador.dev@mcad.local / operador_dev
- gerente.dev@mcad.local / gerente_dev
- analista_distribuicao@mcad.dev / analista_distribuicao
- gestor-acessos.dev@mcad.local / gestor_acessosdev
- consultor-acessos.dev@mcad.local / consultor_acessosdev
- admin_authz2@mcad.dev / admin_authz2
- sem-papel.dev@mcad.local / sem_papel
