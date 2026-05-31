# Review da Task 5.0 - Usuarios de Musica - historico de status com ator enriquecido

Data: 2026-05-30

Resultado final: APROVADA

## 1. Resultado da Validacao Automatizada

Validacao parcialmente executada. Os checks independentes de dependencias privadas passaram. Os checks do modulo `arrecadacao-application`, onde estao os testes focados da task, foram bloqueados por credencial/dependencia privada no GitHub Packages.

### Comandos executados

| Comando | Resultado |
| --- | --- |
| `rtk git branch --show-current` | Passou. Branch atual: `feature/prd-usuario-legivel-immutavel-historico-licencas`. |
| `rtk git status --short` | Passou. Alteracoes da task 5.0 identificadas; diretorios nao rastreados fora do escopo permanecem separados. |
| `rtk sed -n ... /home/tsgomes/.codex/RTK.md` | Passou. Confirmada regra de prefixar comandos com `rtk`. |
| `rtk sed -n ... 5_task.md` | Passou. Task revisada. |
| `rtk sed -n ... prd.md` | Passou. PRD revisado. |
| `rtk sed -n ... techspec.md` | Passou. TechSpec revisada. |
| `rtk sed -n ... java-architecture/SKILL.md` | Passou. Regras Java/Clean Architecture revisadas. |
| `rtk sed -n ... java-code-quality/SKILL.md` | Passou. Regras de qualidade Java revisadas. |
| `rtk sed -n ... java-testing/SKILL.md` | Passou. Regras de teste Java revisadas. |
| `rtk sed -n ... java-production-readiness/SKILL.md` | Passou. Checklist de readiness revisado para riscos aplicaveis. |
| `rtk git diff --check` | Passou. Sem problemas de whitespace. |
| `rtk mvn -f services/arrecadacao-api/pom.xml -pl arrecadacao-domain test` | Passou. 77 testes, 0 falhas, 0 erros, 1 skipped. |
| `rtk mvn -f services/arrecadacao-api/pom.xml -pl arrecadacao-application -Dtest=CriarUsuarioMusicaCommandHandlerTest,InativarUsuarioMusicaCommandHandlerTest,AtivarUsuarioMusicaCommandHandlerTest,ListarHistoricoStatusQueryHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test` | Bloqueado por `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0` no GitHub Packages. |
| `rtk bash -lc 'source .env && rtk mvn -f services/arrecadacao-api/pom.xml -pl arrecadacao-application -Dtest=CriarUsuarioMusicaCommandHandlerTest,InativarUsuarioMusicaCommandHandlerTest,AtivarUsuarioMusicaCommandHandlerTest,ListarHistoricoStatusQueryHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test'` | Mesmo bloqueio: `401 Unauthorized` em `br.org.ecad.audit:audit-sdk-core:1.0.0`. |
| `rtk mvn -f services/arrecadacao-api/pom.xml -pl arrecadacao-application -am -DskipTests compile` | Bloqueado por `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`. |
| `rtk bash -lc 'source .env && rtk mvn -f services/arrecadacao-api/pom.xml -pl arrecadacao-application -am -DskipTests compile'` | Mesmo bloqueio: `401 Unauthorized` em `br.org.ecad.audit:audit-sdk-core:1.0.0`. |

Evidencia do bloqueio:

```text
Could not transfer artifact br.org.ecad.audit:audit-sdk-core:pom:1.0.0
from/to github-ecad-auditoria (https://maven.pkg.github.com/tassosgomes/ecad-auditoria):
authentication failed ... status: 401 Unauthorized
```

## 2. Resultado da Revisao Tecnica

APROVADA.

A implementacao atende a task, PRD e TechSpec dentro do escopo de Usuarios de Musica:

- `HistoricoStatusResponse` preserva o campo legado `autor` e adiciona `ActorDisplayResponse ator`.
- `ListarHistoricoStatusQueryHandler` carrega o historico por `findByUsuarioMusicaIdOrderByDataDesc`, cria snapshots por item, chama `ActorDisplayResolver.resolveAll(...)` e monta as respostas por indice, preservando a ordem retornada pelo repositorio.
- Registros antigos sem `atorSubject` usam `autor`/`autorRotulo` como fallback e retornam `ator.status = DESCONHECIDO` pelo resolver.
- `CriarUsuarioMusicaCommandHandler`, `InativarUsuarioMusicaCommandHandler` e `AtivarUsuarioMusicaCommandHandler` persistem `atorSubject`, `autorRotulo` e `autor` com o rotulo congelado quando recebem `ActorSnapshot`.
- `AtualizarUsuarioMusicaCommandHandler` foi verificado e nao cria historico de status.
- Testes adicionados/ajustados cobrem criacao, inativacao, ativacao, fallback legado, resolucao em lote e serializacao com `autor` + `ator`.
- A separacao de camadas permanece compativel com o desenho existente: API/commands produzem snapshot, application orquestra handlers/queries, domain persiste estado e o resolver usa o port de lookup.

## 3. Achados

Nenhum defeito identificado.

## 4. Riscos e Bloqueios

- Risco de ambiente: os testes e compilacao do modulo `arrecadacao-application` nao puderam ser executados neste ambiente porque a dependencia privada `br.org.ecad.audit:audit-sdk-core:1.0.0` retornou `401 Unauthorized` no GitHub Packages, inclusive com `.env` carregado.
- Esse bloqueio impede confirmar por Maven os testes focados de application nesta validacao, mas nao foi classificado como defeito da implementacao da task porque e consistente com bloqueios ja observados nas validacoes anteriores do mesmo PRD.

## 5. Recomendacao Final

APROVADA.

Prosseguir para checkpoint da task 5.0, mantendo registrado que a validacao integrada de `arrecadacao-application` deve ser reexecutada em ambiente com credenciais validas para o GitHub Packages.
