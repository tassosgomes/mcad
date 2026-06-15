# Task Review — 10.0: Permissões do Analista + Seed (8 chaves)

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Branch:** `feature/prd-acesso-titulares`
> **Data:** 2026-06-15
> **Validador:** ai-flow-validator (subagent)

---

## Resultado Final

# ✅ APROVADA

---

## 1. Validação Automatizada

| Comando | Resultado | Detalhes |
|---|---|---|
| `dotnet build Cadastro.sln` | ✅ PASS | 0 erros, 2 warnings (NU1902 OpenTelemetry — pré-existentes, não introduzidos por esta task) |
| `dotnet test 5-Tests/Cadastro.UnitTests` | ✅ PASS | 345 testes passaram (0 regressões vs baseline; natureza desta task não adiciona testes pois é puramente declarativa) |
| `python3 -m json.tool seeds/mcad/cadastro.permissions.json > /dev/null` | ✅ PASS | JSON válido |

Diretório de execução: `services/cadastro-api` (build/test) e raiz do repo (validação JSON).

---

## 2. Revisão Técnica

### 2.1 Constantes em `CadastroPermissions.cs`

Arquivo: `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs:59-67`

Verificação item a item da tabela de aceitação (subtarefa 10.1):

| # | Constante | Valor esperado | Valor encontrado | Status |
|---|---|---|---|---|
| 1 | `OcorrenciaListar` | `cadastro:default:ocorrencia:listar` | `cadastro:default:ocorrencia:listar` | ✅ |
| 2 | `OcorrenciaVisualizar` | `cadastro:default:ocorrencia:visualizar` | `cadastro:default:ocorrencia:visualizar` | ✅ |
| 3 | `OcorrenciaAnalisar` | `cadastro:default:ocorrencia:analisar` | `cadastro:default:ocorrencia:analisar` | ✅ |
| 4 | `OcorrenciaResolver` | `cadastro:default:ocorrencia:resolver` | `cadastro:default:ocorrencia:resolver` | ✅ |
| 5 | `OcorrenciaCancelar` | `cadastro:default:ocorrencia:cancelar` | `cadastro:default:ocorrencia:cancelar` | ✅ |
| 6 | `SolicitacaoAlteracaoListar` | `cadastro:default:solicitacao-alteracao:listar` | `cadastro:default:solicitacao-alteracao:listar` | ✅ |
| 7 | `SolicitacaoAlteracaoAprovar` | `cadastro:default:solicitacao-alteracao:aprovar` | `cadastro:default:solicitacao-alteracao:aprovar` | ✅ |
| 8 | `SolicitacaoAlteracaoRejeitar` | `cadastro:default:solicitacao-alteracao:rejeitar` | `cadastro:default:solicitacao-alteracao:rejeitar` | ✅ |

**Total: 8/8 constantes com valores exatos.**

### 2.2 Convenção de Código

- ✅ Segue o padrão `public const string {Nome} = "...";` da static class `CadastroPermissions`.
- ✅ Indentação (4 espaços) e espaçamento entre blocos (linha em branco separando grupos `Ocorrencia*` de `SolicitacaoAlteracao*`) consistentes com os demais grupos (`associacao`, `titular`, `obra`, etc.).
- ✅ Agrupamento lógico: `Ocorrencia*` logo após `Anexo*` (na ordem semântica esperada pelo PRD).
- ✅ Sem trailing whitespace, sem comentários desnecessários, sem `any`.

### 2.3 Seed JSON em `seeds/mcad/cadastro.permissions.json`

Arquivo: `seeds/mcad/cadastro.permissions.json:56-64`

Verificação das 8 entradas (subtarefa 10.2) — schema `{ key, displayName, description, resource, action }`:

| key | displayName | description | resource | action |
|---|---|---|---|---|
| `cadastro:default:ocorrencia:listar` | Listar ocorrências (todas) | Permite listar todas as ocorrências no painel do analista. | ocorrencia | listar |
| `cadastro:default:ocorrencia:visualizar` | Visualizar ocorrência | Acesso aos detalhes de uma ocorrência específica. | ocorrencia | visualizar |
| `cadastro:default:ocorrencia:analisar` | Assumir análise de ocorrência | Move uma ocorrência para o status EM_ANALISE. | ocorrencia | analisar |
| `cadastro:default:ocorrencia:resolver` | Resolver ocorrência | Registra parecer e resolve uma ocorrência. | ocorrencia | resolver |
| `cadastro:default:ocorrencia:cancelar` | Cancelar ocorrência | Cancela uma ocorrência com justificativa. | ocorrencia | cancelar |
| `cadastro:default:solicitacao-alteracao:listar` | Listar solicitações de alteração | Lista todas as solicitações de alteração no painel do analista. | solicitacao-alteracao | listar |
| `cadastro:default:solicitacao-alteracao:aprovar` | Aprovar solicitação de alteração | Aprova uma solicitação e aplica o efeito no titular. | solicitacao-alteracao | aprovar |
| `cadastro:default:solicitacao-alteracao:rejeitar` | Rejeitar solicitação de alteração | Rejeita uma solicitação com justificativa. | solicitacao-alteracao | rejeitar |

**Total: 8/8 entradas com schema completo.**

Conformidade estrutural:
- ✅ `key` corresponde exatamente ao valor da constante C# equivalente (sincronização código↔seed 1:1).
- ✅ `resource` (`ocorrencia` / `solicitacao-alteracao`) e `action` extraídos corretamente dos segmentos 3 e 4 da chave (padrão 4-segmentos `service:area:resource:action`).
- ✅ Linha em branco separando os grupos `ocorrencia*` e `solicitacao-alteracao*` — idem grupos pré-existentes.
- ✅ Vírgula final no último item `desbloquear-fonograma` adicionada corretamente (era o item terminal; agora passou a ser intermediário).
- ✅ Última entrada `solicitacao-alteracao:rejeitar` sem vírgula trailing — JSON bem-formado.

### 2.4 Sincronização Código ↔ Seed

| Constante C# | key no JSON | Match |
|---|---|---|
| `OcorrenciaListar` | `cadastro:default:ocorrencia:listar` | ✅ |
| `OcorrenciaVisualizar` | `cadastro:default:ocorrencia:visualizar` | ✅ |
| `OcorrenciaAnalisar` | `cadastro:default:ocorrencia:analisar` | ✅ |
| `OcorrenciaResolver` | `cadastro:default:ocorrencia:resolver` | ✅ |
| `OcorrenciaCancelar` | `cadastro:default:ocorrencia:cancelar` | ✅ |
| `SolicitacaoAlteracaoListar` | `cadastro:default:solicitacao-alteracao:listar` | ✅ |
| `SolicitacaoAlteracaoAprovar` | `cadastro:default:solicitacao-alteracao:aprovar` | ✅ |
| `SolicitacaoAlteracaoRejeitar` | `cadastro:default:solicitacao-alteracao:rejeitar` | ✅ |

**8/8 sincronizadas.** Sem drift entre fonte e seed.

### 2.5 Subtarefas 10.3 e 10.4

- **10.3 (Scripts de provisionamento):** Marcada como *"Se aplicável"* no task file. A inspeção do PRD/TechSpec confirma que o `cadastro.permissions.json` é o contrato consumido pelo authz-service — não há `scripts/seed-authz.sh` ou `scripts/provision-logto.sh` que precise ser regenerado nesta task (a dívida técnica pré-existente das permissões `anexo:*` fora do seed foi explicitamente excluída do escopo pela nota no rodapé do task file). **Não aplicável.**
- **10.4 (AUTH_ENABLED=false / TestAuthHandler):** ✅ Confirmado indiretamente — 345 testes unitários passaram, incluindo a suíte existente que depende do `TestAuthHandler`. As novas constantes são puramente declarativas (`public const string`); nenhum fluxo de autorização em runtime foi alterado, portanto o comportamento do `HttpContextCurrentUserPermissions`/`TestAuthHandler` permanece inalterado.

---

## 3. Aceitação dos Critérios de Sucesso (task file)

| Critério | Status | Evidência |
|---|---|---|
| As 8 constantes estão em `CadastroPermissions.cs` com os valores exatos | ✅ | Seção 2.1 (8/8) |
| As 8 entradas estão em `cadastro.permissions.json` com `key`, `displayName`, `description`, `resource`, `action` | ✅ | Seção 2.3 (8/8) |
| `dotnet build` passa | ✅ | 0 erros, 2 warnings pré-existentes |
| O seed é válido JSON (`python -m json.tool`) | ✅ | `JSON VALID` |

---

## 4. Conformidade com PRD e TechSpec

- **PRD — Permissionamento (ecad-authz):** As 8 chaves cobrem integralmente os endpoints do Analista previstos (triagem de ocorrências: listar/visualizar/analisar/resolver/cancelar; aprovação de solicitações: listar/aprovar/rejeitar).
- **TechSpec — Endpoints de API (Analista) + Análise de Impacto:** Sufixos de ação alinhados com os verbos REST/planos de uso (`listar` para GET, `analisar`/`resolver`/`cancelar`/`aprovar`/`rejeitar` para POST de transições de estado). Convenão 4-segmentos `cadastro:default:{recurso}:{acao}` respeitada.
- **Naming:** PascalCase em C#, kebab-case na `action` do JSON, consistente com as 48 entradas pré-existentes.

---

## 5. Observações Não-Bloqueantes

1. **Dívida técnica pré-existente (fora de escopo):** As constantes `Anexo*` (`CadastroPermissions.cs:53-57`) continuam sem entradas no seed JSON. Conforme nota explícita no task file, esta dívida **não** deve ser resolvida nesta task. Recomenda-se issue separada.
2. **Versionamento do seed:** O campo `version` no JSON permanece `"1.1.0"` (não foi bumpado). Como não há contract test que valide bump de versão do seed, isto é aceitável; registrar apenas para auditoria futura caso o authz-service passe a versionar consumers.
3. **Sem novos testes unitários:** Apropriado — a task é declarativa (constantes string + JSON). Não há lógica a testar; a sincronização código↔seed é validada por inspeção (ou futuramente por um teste de contrato, se desejado).

---

## 6. Conclusão

Task **10.0 — Permissões do Analista + Seed (8 chaves)** totalmente implementada e em conformidade com PRD, TechSpec e padrões do projeto (`CadastroPermissions.cs` + `cadastro.permissions.json`).

- 8/8 constantes corretas.
- 8/8 entradas de seed corretas e sincronizadas 1:1.
- Build e testes verdes (0 regressões).
- JSON válido.

**Veredito: APROVADA** — task desbloqueia 11.0 e 12.0.
