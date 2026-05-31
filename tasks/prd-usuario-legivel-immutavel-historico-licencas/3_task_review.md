# Review da Task 3.0 — CurrentActorResolver na API e comandos com ActorSnapshot

## Resultado Final

APROVADA

Review técnico aprovado para a task 3.0. Nenhum defeito de implementação foi identificado na revisão de conformidade com task, PRD, techspec e padrões Java aplicáveis.

Risco registrado: os testes/compile dos módulos `arrecadacao-application` e `arrecadacao-api` não puderam ser concluídos neste ambiente por bloqueio de credencial/dependência privada no GitHub Packages para `br.org.ecad.audit:audit-sdk-core:1.0.0` (`401 Unauthorized`), inclusive após carregar `.env`.

## Validação Automatizada

| Comando | Resultado |
| --- | --- |
| `rtk git branch --show-current` | Passou. Branch atual: `feature/prd-usuario-legivel-immutavel-historico-licencas`. |
| `rtk git status --short` | Confirmou alterações da task 3.0 e diretórios não rastreados fora do escopo já existentes. |
| `rtk git diff --check` | Passou. Nenhum problema de whitespace. |
| `rtk mvn -pl arrecadacao-domain test` | Passou. 77 testes, 0 falhas, 0 erros, 1 skipped. |
| `rtk mvn -pl arrecadacao-api -am -Dtest=CurrentActorResolverTest -Dsurefire.failIfNoSpecifiedTests=false test` | Bloqueado por `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`. |
| `rtk mvn -pl arrecadacao-application -Dtest=SuspenderLicencaCommandHandlerTest,ReativarLicencaCommandHandlerTest,EncerrarLicencaCommandHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test` | Bloqueado por `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`. |
| `source .env && rtk mvn -pl arrecadacao-api -am -Dtest=CurrentActorResolverTest -Dsurefire.failIfNoSpecifiedTests=false test` | Mesmo bloqueio de credencial/dependência privada. |
| `source .env && rtk mvn -pl arrecadacao-application -Dtest=SuspenderLicencaCommandHandlerTest,ReativarLicencaCommandHandlerTest,EncerrarLicencaCommandHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test` | Mesmo bloqueio de credencial/dependência privada. |
| `source .env && rtk mvn -pl arrecadacao-api -am -DskipTests compile` | Mesmo bloqueio de credencial/dependência privada. |

Também foram usados comandos de inspeção com `rtk sed`, `rtk rg`, `rtk git diff --stat` e `rtk git diff -- <arquivos>` para revisar task, PRD, techspec, skills Java aplicáveis e alterações da implementação.

## Revisão Técnica

### Conformidade com a Task

- `CurrentActorResolver` foi criado no módulo `arrecadacao-api`.
- A extração do ator centraliza `sub`, `preferred_username`, `name` e `email`, com fallback para `Authentication.getName()` e `sistema`.
- Há log `INFO` no fallback para autenticação não JWT em escrita humana.
- `LicencaController` e `UsuarioMusicaController` não mantêm os métodos locais `extrairAutor()`/`extrairAutorDoJwt()`.
- `UdaController` e `PagamentoController` não usam mais `Authentication.getName()` diretamente para montar commands.
- Os controllers de escrita afetados usam `CurrentActorResolver` e delegam a montagem do snapshot para `ActorDisplayResolver.snapshotFrom(...)`.
- Commands afetados recebem `ActorSnapshot` e mantêm construtores legados com `String autor` para compatibilidade incremental.
- Handlers persistem `subject` e rótulo nos históricos de licença/usuário, UDA e estorno de pagamento usando os overloads de domínio.
- As permissões existentes com `@RequiresPermission` foram preservadas.

### Conformidade com PRD e Techspec

- A escrita de novos históricos deixa de depender apenas de claims voláteis quando JWT com `sub` está disponível.
- O rótulo humano congelado continua vindo do fluxo de `ActorDisplayResolver.snapshotFrom(CurrentActor)`.
- A API permanece como camada responsável por extrair contexto HTTP/Spring Security, enquanto application/domain recebem modelos sem dependência de Spring Security.
- O escopo não altera IdP, autenticação, autorização ou contratos funcionais dos endpoints.

### Testes

- `CurrentActorResolverTest` cobre JWT completo, JWT sem `preferred_username`, JWT sem `sub`, autenticação não JWT e ausência de autenticação.
- Testes de handlers de licença foram ajustados para verificar passagem de `subject` e rótulo aos métodos de domínio.
- A execução automatizada dos testes específicos de API/application ficou bloqueada por credencial privada, não por falha observada no código da task.

## Achados

Nenhum defeito identificado.

## Riscos e Bloqueios

- Compile/test dos módulos `arrecadacao-application` e `arrecadacao-api` não foram concluídos por `401 Unauthorized` no GitHub Packages ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`, mesmo com `.env` carregado.
- Por esse bloqueio externo, não foi possível confirmar via Maven a compilação completa dos módulos que dependem de `arrecadacao-application`.

## Recomendação

APROVADA, com risco operacional registrado para reexecutar compile/test completos em ambiente com credenciais válidas do GitHub Packages.
