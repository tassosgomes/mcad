# QA Report — F01: Seed de Associacoes
> **Data de execucao:** 2026-04-08
> **Executor:** Claude Code (Playwright CLI + curl + psql)
> **Ambiente:** localhost (stack local)

---

## Resumo Executivo

| CT | Descricao | Resultado |
|----|-----------|-----------|
| CT-01 | Seed automatico no startup | **PASSOU** |
| CT-02 | API GET /associacoes | **PASSOU** |
| CT-03 | API GET /associacoes/{id} | **PASSOU** |
| CT-04 | API bloqueia escrita (405) | **PASSOU** |
| CT-05 | API requer autenticacao | **PASSOU** |
| CT-06 | Frontend como Analista | **PASSOU** |
| CT-07 | Frontend como Consultor | **PASSOU** |
| CT-08 | Ausencia de acoes de escrita | **PASSOU** |
| CT-09 | Performance < 1s | **PASSOU** |
| CT-10 | Tratamento de erro (API indisponivel) | **FALHOU** (parcial) |

**Resultado geral: 9/10 PASSOU, 1/10 FALHOU**

---

## Detalhamento por CT

### CT-01 — Seed automatico no startup — PASSOU

- Log do startup: `Startup: 7 associacoes no banco de dados`
- Banco retornou exatamente 7 registros com os dados corretos

```
  Sigla   |                                   Nome                                    |        Cnpj        | Codigo 
----------+---------------------------------------------------------------------------+--------------------+--------
 ABRAMUS  | Associação Brasileira de Música e Artes                                   | 50.997.063/0001-32 |      1
 AMAR     | Associação de Músicos, Arranjadores e Regentes                            | 30.713.325/0001-82 |      2
 ASSIM    | Associação de Intérpretes e Músicos                                       | 43.985.563/0001-99 |      3
 SBACEM   | Sociedade Brasileira de Autores, Compositores e Escritores de Música      | 33.780.222/0001-23 |      4
 SICAM    | Sociedade Independente de Compositores e Autores Musicais                 | 62.092.010/0001-51 |      5
 SOCINPRO | Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais | 33.748.146/0001-79 |      6
 UBC      | União Brasileira de Compositores                                          | 33.576.166/0001-00 |      7
(7 rows)
```

---

### CT-02 — API GET /associacoes — PASSOU

- HTTP 200, array com 7 objetos JSON
- Campos presentes: `id` (UUID), `codigo` (int 1-7), `sigla`, `nome`, `cnpj`
- Todas as 7 siglas presentes
- CNPJ no formato XX.XXX.XXX/XXXX-XX

> **Nota de configuracao:** O plano de testes indicava usar `admin-cli` para obter token, mas esse
> client nao tem `sub` e a API valida `azp == mcad-frontend`. Solucao: habilitar direct access
> grants em `mcad-frontend` via Keycloak Admin API para os testes de API via curl.

---

### CT-03 — API GET /associacoes/{id} — PASSOU

- GET ABRAMUS (ID `a1b2c3d4-e5f6-7890-abcd-ef1234567890`): HTTP 200, dados corretos
- GET ID inexistente `00000000-0000-0000-0000-000000000000`: HTTP 404

---

### CT-04 — API bloqueia operacoes de escrita — PASSOU

| Metodo | Resultado |
|--------|-----------|
| POST /associacoes | HTTP 405 |
| PUT /associacoes/{id} | HTTP 405 |
| PATCH /associacoes/{id} | HTTP 405 |
| DELETE /associacoes/{id} | HTTP 405 |

---

### CT-05 — API requer autenticacao — PASSOU

- Sem token: HTTP 401
- Token invalido: HTTP 401

---

### CT-06 — Frontend como Analista de Cadastro — PASSOU

- Redirecionou para Keycloak ao acessar `/`
- Login com `analista.teste` bem-sucedido
- Redirecinou para `/cadastro/associacoes`
- Secao "Cadastro" visivel no menu com links: Associacoes, Titulares, Obras, Fonogramas
- Titulo: "Associacoes" com subtitulo "Associacoes de gestao coletiva do ECAD"
- Tabela com 7 linhas, colunas: Codigo, Sigla, Nome, CNPJ
- Primeira linha: `#1 | ABRAMUS | Associação Brasileira de Música e Artes | 50.997.063/0001-32`
- Ultima linha: `#7 | UBC | União Brasileira de Compositores | 33.576.166/0001-00`

**Evidencia:** `ct06-01-redirect-keycloak.png`, `ct06-02-pagina-associacoes.png`

---

### CT-07 — Frontend como Consultor — PASSOU

- Login com `consultor.teste` bem-sucedido
- Mesmos 7 registros exibidos identicamente ao CT-06
- Header mostra "Consultor Teste / Consultor"

**Evidencia:** `ct07-01-consultor-associacoes.png`

---

### CT-08 — Ausencia de acoes de escrita — PASSOU

- Nenhum botao "Novo", "Criar", "Adicionar", "Editar" ou "Excluir" no snapshot da pagina
- Busca por palavras-chave no snapshot: nenhum resultado

---

### CT-09 — Performance < 1s — PASSOU

- Tempo de resposta da API GET /associacoes: **20ms**
- Muito abaixo do limite de 1000ms

---

### CT-10 — Tratamento de erro (API indisponivel) — FALHOU (parcial)

**O que falhou:**
- Quando a API foi parada, a area principal (`<main>`) ficou vazia — sem mensagem de erro visivel ao usuario, sem botao "Tentar novamente"
- O frontend simplesmente exibiu o layout (header + sidebar) com conteudo em branco

**O que funcionou:**
- Apos reiniciar a API e recarregar a pagina, a tabela voltou a exibir os dados corretamente
- O mecanismo de refresh de token do oidc-client-ts funcionou (renovacao automatica via POST /token ao Keycloak)

**Evidencia:** `ct10-01-api-indisponivel.png`, `ct10-02-tela-vazia-sem-erro.png`, `ct10-04-api-recuperada-tabela.png`

**Bug reportado:** Ausencia de estado de erro com mensagem amigavel e botao de retry na listagem de associacoes quando a API retorna erro (network error ou 5xx).

---

## Observacoes Adicionais

### Problema encontrado: token para testes de API
O plano de testes indicava usar `admin-cli` para obter tokens JWT via password grant. Isso nao funciona porque:
1. O token do `admin-cli` nao tem `sub` claim
2. A API valida que `azp == mcad-frontend` (via `OnTokenValidated`)

**Correcao aplicada:** Habilitou-se direct access grants no client `mcad-frontend` via Keycloak Admin API.

**Recomendacao:** Atualizar o plano de testes para usar `mcad-frontend` ou criar um client dedicado para testes de API com as permissoes corretas.

### Problema encontrado: restart da API em CT-10
Ao restartar a API manualmente com o binario (`./Cadastro.API`), o `DotEnvLoader` nao carregou as variaveis de ambiente, causando falha de conexao ao banco. O restart correto exige `dotnet run --launch-profile http`.

**Recomendacao:** Adicionar um script de restart individual por servico no `dev.sh` (ex: `./dev.sh restart cadastro-api`).
