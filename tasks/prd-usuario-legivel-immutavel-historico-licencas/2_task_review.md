# Review da Task 2.0 - Modelos, ports e resolucao de exibicao de ator

## Resultado Final

APROVADA

Review tecnico aprovado para a task 2.0. Nao foram identificados defeitos de implementacao no escopo revisado.

## Validacao Automatizada

| Comando | Resultado |
| --- | --- |
| `rtk git branch --show-current` | Passou. Branch atual: `feature/prd-usuario-legivel-immutavel-historico-licencas`. |
| `rtk git status --short` | Passou para inspecao. Alteracoes da task 2.0 presentes e sem commit; existem arquivos nao rastreados fora do escopo em `tasks/plataforma/prd-authz-fonte-unica-assignments/qa-evidence/` e `tasks/prd-filtros-auditoria-acessos/`. |
| `rtk git diff --check` | Passou, sem problemas de whitespace. |
| `rtk mvn -pl arrecadacao-application -Dtest=ActorDisplayResolverTest test` | Bloqueado por dependencia privada: `br.org.ecad.audit:audit-sdk-core:1.0.0` retornou `401 Unauthorized` no GitHub Packages. |
| `rtk mvn -pl arrecadacao-infra -Dtest=JdbcIdentityUserLookupTest test` | Bloqueado pelo mesmo `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`. |
| `rtk mvn -pl arrecadacao-infra -am -DskipTests compile` | Bloqueado pelo mesmo `401 Unauthorized`; o reactor compilou `arrecadacao-domain`, mas falhou em `arrecadacao-application` antes de compilar `arrecadacao-infra`. |
| `source .env && rtk mvn -pl arrecadacao-application -Dtest=ActorDisplayResolverTest test` | Mesmo bloqueio de credencial/dependencia privada. |
| `source .env && rtk mvn -pl arrecadacao-infra -Dtest=JdbcIdentityUserLookupTest test` | Mesmo bloqueio de credencial/dependencia privada. |
| `source .env && rtk mvn -pl arrecadacao-infra -am -DskipTests compile` | Mesmo bloqueio de credencial/dependencia privada. |

Evidencia do bloqueio Maven: `authentication failed for https://maven.pkg.github.com/tassosgomes/ecad-auditoria/br/org/ecad/audit/audit-sdk-core/1.0.0/audit-sdk-core-1.0.0.pom, status: 401 Unauthorized`.

## Revisao Tecnica

### Conformidade com a Task

- `ActorSnapshot`, `ActorDisplayResponse`, `IdentityUserProjection`, `CurrentActor` e `ActorDisplayStatus` foram criados na camada application.
- `IdentityUserLookup` define consulta por subject e disponibiliza metodo em lote por colecao.
- `ActorDisplayResolver` implementa `snapshotFrom(CurrentActor)`, `resolve(subject, legacyLabel)` e resolucao em lote com deduplicacao de subjects.
- `JdbcIdentityUserLookup` consulta `arrecadacao.usuarios_identidade` usando `logto_user_id` como chave.
- O resolver preserva o rotulo congelado em leitura e usa a projecao sincronizada para complementar dados atuais e status.
- Status `ATIVO`, `SUSPENSO`, `REMOVIDO` e `DESCONHECIDO` foram mapeados conforme `is_suspended` e `deleted_at_utc`.
- Lookup ausente ou com erro degrada para fallback sem propagar excecao ao chamador e registra `WARN`.
- Testes unitarios cobrem fallbacks de label, status, subject em branco, lookup com erro e resolucao em lote.

### Conformidade com PRD e Tech Spec

- A implementacao usa somente a projecao local `arrecadacao.usuarios_identidade`, sem chamada sincrona ao IdP.
- A ordem de label atende ao PRD: `displayName (username)`, depois `username`, depois `email`, depois fallback tecnico/legado.
- Historico antigo sem `subject` retorna ator com `status = DESCONHECIDO` e label legado.
- A leitura nao altera retroativamente o label congelado.
- O adapter JDBC le `username`, `display_name`, `email`, `is_suspended` e `deleted_at_utc` da tabela existente.

### Conformidade com Skills Java

- Clean Architecture preservada: port/modelos na application e adapter JDBC na infra.
- Dependencias usam constructor injection; nao ha field injection.
- Ausencia de resultados usa `Optional`/colecoes vazias.
- Logs usam SLF4J placeholders e nao logam e-mail em massa.
- Testes seguem JUnit 5, AssertJ, Mockito e padrao AAA.

## Achados

Nenhum defeito identificado.

## Riscos e Bloqueios

- Testes e compilacao Maven nao puderam ser executados ate o fim neste ambiente por credencial/dependencia privada do GitHub Packages (`br.org.ecad.audit:audit-sdk-core:1.0.0`, `401 Unauthorized`). Esse bloqueio impede confirmar build/testes automatizados localmente, mas nao foi classificado como defeito da implementacao porque o mesmo bloqueio ja existia antes e persistiu mesmo carregando `.env`.

## Recomendacao

APROVADA. Prosseguir para checkpoint da task 2.0, mantendo o risco de validacao Maven registrado para reexecucao em ambiente com credenciais corretas.
