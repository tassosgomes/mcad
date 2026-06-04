CASOS DE TESTE - Acessos Operations
===================================

Escopo: validar operacoes read-only de Atribuicoes via BFF/UI para os usuarios gestor-acessos, consultor-acessos e sem_papel. Nao executar atribuicao nem remocao de papeis.

CT-01: Gestor de Acessos consulta operacoes read-only globais
  Pre-condicao: usuario gestor-acessos.dev autentica via Logto e possui permissoes efetivas de Acessos.
  Passos:
    1. Autenticar no frontend MCAD.
    2. Abrir /autorizacao/atribuicoes e capturar screenshot.
    3. Executar GET /api/acessos/usuarios?query=acessos&page=0&size=10.
    4. Executar GET /api/acessos/papeis?page=0&size=20.
    5. Executar GET /api/acessos/assignments?page=0&size=20.
    6. Executar GET /api/acessos/atribuicoes/historico?page=0&size=10.
  Expected: rota de UI acessivel e todos os endpoints retornam 200 com payload JSON.
  Tipo: UI + API

CT-02: Consultor de Acessos consulta operacoes read-only sem escrita
  Pre-condicao: usuario consultor-acessos.dev autentica via Logto e possui perfil read-only de Acessos.
  Passos:
    1. Autenticar no frontend MCAD.
    2. Abrir /autorizacao/atribuicoes e capturar screenshot.
    3. Executar GET /api/acessos/usuarios?query=acessos&page=0&size=10.
    4. Executar GET /api/acessos/papeis?page=0&size=20.
    5. Executar GET /api/acessos/assignments?page=0&size=20.
    6. Executar GET /api/acessos/atribuicoes/historico?page=0&size=10.
  Expected: rota de UI acessivel e todos os endpoints read-only retornam 200 com payload JSON.
  Tipo: UI + API

CT-03: Usuario sem papel recebe negacao segura em Acessos
  Pre-condicao: usuario sem-papel.dev autentica via Logto sem assignment de negocio.
  Passos:
    1. Autenticar no frontend MCAD.
    2. Tentar abrir /autorizacao/atribuicoes e capturar screenshot.
    3. Executar os mesmos GETs read-only de Acessos.
  Expected: UI inacessivel ou exibindo estado de permissao negada; endpoints protegidos retornam 403.
  Tipo: UI + API

Regras de execucao:
- Tokens e senhas nao devem ser impressos nem persistidos.
- Authorization deve aparecer apenas como Bearer [TOKEN REDACTED] em requests.log.
- Em caso de falha de status esperado, interromper a execucao e gerar relatorio FAIL.
