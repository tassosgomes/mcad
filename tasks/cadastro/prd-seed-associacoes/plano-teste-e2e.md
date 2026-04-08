# Plano de Teste E2E — F01: Seed de Associacoes

> **PRD:** `prd-seed-associacoes/prd.md`
> **Data:** 2026-04-07
> **Executor:** QA / Humano
> **Pre-requisitos:** Stack rodando (`./dev.sh start`), Keycloak provisionado

---

## Dados de Acesso

| Usuario | Senha | Role | Acesso esperado |
|---------|-------|------|-----------------|
| analista.teste | Analista123! | analista-cadastro | Sim |
| consultor.teste | Consultor123! | consultor | Sim |
| analista.ident | Analista123! | analista-identificacao | Sim (API) / Nao (frontend) |

**URLs:**
- Frontend: http://localhost:5173
- API Cadastro: http://localhost:5001/api/v1
- Keycloak: https://keycloak.tasso.dev.br/realms/mcad

---

## Cenarios de Teste

### CT-01 — Seed automatico no startup (RF-01, RF-02, RF-03)

**Objetivo:** Validar que as 7 associacoes estao presentes apos o startup, sem intervencao manual.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Iniciar a stack com `./dev.sh start` | cadastro-api sobe sem erros |
| 2 | Verificar logs do cadastro-api: `cat .tmp/logs/cadastro-api.log \| grep -i associ` | Log indica 7 associacoes encontradas |
| 3 | Consultar o banco diretamente: `PGPASSWORD=gestauto123 psql -h db.tasso.dev.br -U gestauto -d mcad -c "SELECT sigla, nome, cnpj FROM cadastro.associacoes ORDER BY sigla;"` | Retorna exatamente 7 registros |
| 4 | Reiniciar a API (`./dev.sh stop && ./dev.sh start`) | Continua com 7 registros, sem duplicatas |
| 5 | Repetir o SELECT do passo 3 | Mesmos 7 registros, IDs identicos |

**Dados esperados no banco:**

| Sigla | Nome | CNPJ |
|-------|------|------|
| ABRAMUS | Associacao Brasileira de Musica e Artes | 50.997.063/0001-32 |
| AMAR | Associacao de Musicos, Arranjadores e Regentes | 30.713.325/0001-82 |
| ASSIM | Associacao de Interpretes e Musicos | 43.985.563/0001-99 |
| SBACEM | Sociedade Brasileira de Autores, Compositores e Escritores de Musica | 33.780.222/0001-23 |
| SICAM | Sociedade Independente de Compositores e Autores Musicais | 62.092.010/0001-51 |
| SOCINPRO | Sociedade Brasileira de Administracao e Protecao de Direitos Intelectuais | 33.748.146/0001-79 |
| UBC | Uniao Brasileira de Compositores | 33.576.166/0001-00 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-02 — API GET /associacoes (RF-08)

**Objetivo:** Validar que a API retorna todas as 7 associacoes com os campos corretos.

**Pre-requisito:** Obter token JWT via login no Keycloak.

```
TOKEN=$(curl -sk -X POST "https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=analista.teste" \
  -d "password=Analista123!" \
  -d "grant_type=password" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

> Nota: usar `admin-cli` para obter token via password grant, pois `mcad-frontend` tem direct access desabilitado.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/v1/associacoes \| python3 -m json.tool` | HTTP 200, array JSON com 7 objetos |
| 2 | Verificar campos de cada objeto | Cada objeto contem: `id` (UUID), `codigo` (inteiro 1-7), `sigla`, `nome`, `cnpj` |
| 3 | Verificar que todas as 7 siglas estao presentes | ABRAMUS, AMAR, ASSIM, SBACEM, SICAM, SOCINPRO, UBC |
| 4 | Verificar formato do CNPJ | Formato XX.XXX.XXX/XXXX-XX (18 chars com pontuacao) |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-03 — API GET /associacoes/{id} (RF-09)

**Objetivo:** Validar consulta individual por ID.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Obter o ID da ABRAMUS a partir da listagem (CT-02) | UUID valido |
| 2 | `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/v1/associacoes/{id}` | HTTP 200, objeto JSON com dados da ABRAMUS |
| 3 | Verificar campos: sigla="ABRAMUS", cnpj="50.997.063/0001-32" | Dados corretos |
| 4 | `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/v1/associacoes/00000000-0000-0000-0000-000000000000` | HTTP 404 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-04 — API bloqueia operacoes de escrita (RF-04, RF-10)

**Objetivo:** Validar que POST, PUT, PATCH e DELETE retornam 405.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"sigla":"TEST"}' http://localhost:5001/api/v1/associacoes` | HTTP 405 |
| 2 | `curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"sigla":"TEST"}' http://localhost:5001/api/v1/associacoes/{id}` | HTTP 405 |
| 3 | `curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"sigla":"TEST"}' http://localhost:5001/api/v1/associacoes/{id}` | HTTP 405 |
| 4 | `curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/v1/associacoes/{id}` | HTTP 405 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-05 — API requer autenticacao

**Objetivo:** Validar que endpoints exigem token JWT valido.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/v1/associacoes` (sem token) | HTTP 401 |
| 2 | `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer token_invalido" http://localhost:5001/api/v1/associacoes` | HTTP 401 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-06 — Frontend: login e navegacao como Analista de Cadastro (RF-05, RF-06)

**Objetivo:** Validar tela de associacoes via browser com perfil analista-cadastro.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Abrir http://localhost:5173 no browser | Redireciona para tela de login do Keycloak |
| 2 | Fazer login com `analista.teste` / `Analista123!` | Redireciona de volta ao frontend |
| 3 | Verificar que a pagina padrao carregou | Redireciona para `/cadastro/associacoes` |
| 4 | Verificar menu lateral (sidebar) | Secao "Cadastro" visivel com link "Associacoes" |
| 5 | Verificar titulo da pagina | "Associacoes" com subtitulo sobre gestao coletiva |
| 6 | Verificar tabela | 7 linhas com colunas: Codigo, Sigla, Nome, CNPJ |
| 7 | Conferir dados da primeira linha (ABRAMUS) | Codigo=#1, Sigla=ABRAMUS, CNPJ=50.997.063/0001-32 |
| 8 | Conferir dados da ultima linha (UBC) | Codigo=#7, Sigla=UBC, CNPJ=33.576.166/0001-00 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-07 — Frontend: login como Consultor (RF-06)

**Objetivo:** Validar que o perfil consultor tambem acessa a tela.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Fazer logout (se logado) | Redireciona para login |
| 2 | Fazer login com `consultor.teste` / `Consultor123!` | Redireciona ao frontend |
| 3 | Navegar para Cadastro > Associacoes | Tabela com 7 associacoes carrega normalmente |
| 4 | Verificar que os mesmos dados sao exibidos | Identico ao CT-06 |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-08 — Frontend: ausencia de acoes de escrita (RF-07)

**Objetivo:** Validar que nao existem botoes de criacao, edicao ou exclusao.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Na tela de associacoes, verificar area acima da tabela | Nao existe botao "Novo", "Criar" ou "Adicionar" |
| 2 | Verificar cada linha da tabela | Nao existe icone/botao de "Editar" ou "Excluir" |
| 3 | Clicar em uma linha da tabela | Nao abre formulario de edicao (ou nao eh clicavel) |
| 4 | Verificar se existe menu de contexto (botao direito) | Nenhuma acao de escrita disponivel |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-09 — Frontend: performance de carregamento

**Objetivo:** Validar que a listagem carrega em menos de 1 segundo.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Abrir DevTools do browser (F12) > aba Network | Ferramentas abertas |
| 2 | Navegar para a tela de associacoes (ou recarregar com Ctrl+Shift+R) | Pagina carrega |
| 3 | Verificar tempo da requisicao GET /associacoes | Menos de 1 segundo (tipicamente < 100ms) |
| 4 | Verificar que nao ha loading spinner prolongado | Tabela aparece quase instantaneamente |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

### CT-10 — Frontend: tratamento de erro (cenario de falha)

**Objetivo:** Validar comportamento quando a API esta indisponivel.

| Passo | Acao | Resultado Esperado |
|-------|------|--------------------|
| 1 | Parar o cadastro-api (`kill` o processo ou `./dev.sh stop`) | API indisponivel |
| 2 | Recarregar a pagina de associacoes no browser | Exibe mensagem de erro (nao tela em branco) |
| 3 | Verificar se existe botao de "Tentar novamente" | Botao de retry visivel |
| 4 | Reiniciar o cadastro-api | API disponivel novamente |
| 5 | Clicar no botao de retry | Tabela carrega normalmente |

**Resultado:** [ ] PASSOU  [ ] FALHOU

---

## Checklist Resumo

| CT | Descricao | RF | Resultado |
|----|-----------|----|-----------|
| CT-01 | Seed automatico no startup | RF-01, RF-02, RF-03 | [ ] |
| CT-02 | API GET /associacoes | RF-08 | [ ] |
| CT-03 | API GET /associacoes/{id} | RF-09 | [ ] |
| CT-04 | API bloqueia escrita (405) | RF-04, RF-10 | [ ] |
| CT-05 | API requer autenticacao | - | [ ] |
| CT-06 | Frontend como Analista | RF-05, RF-06 | [ ] |
| CT-07 | Frontend como Consultor | RF-06 | [ ] |
| CT-08 | Ausencia de acoes de escrita | RF-07 | [ ] |
| CT-09 | Performance < 1s | - | [ ] |
| CT-10 | Tratamento de erro | - | [ ] |

---

## Observacoes do Testador

_(Espaco para anotacoes durante a execucao)_

| CT | Observacao |
|----|-----------|
| | |
| | |
| | |
