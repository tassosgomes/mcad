# Validacao da Task 1.0 - Migration V14 e campos de ator historico no dominio

Data: 2026-05-30
Branch validada: `feature/prd-usuario-legivel-immutavel-historico-licencas`
PRD dir: `tasks/prd-usuario-legivel-immutavel-historico-licencas`
Task: `tasks/prd-usuario-legivel-immutavel-historico-licencas/1_task.md`
Techspec: `/home/tsgomes/mcad/tasks/prd-usuario-legivel-immutavel-historico-licencas/techspec.md`

## Resultado da validacao automatizada

Status: APROVADA COM RISCO DE VERIFICACAO EXTERNA

Comandos executados:

- `rtk git branch --show-current`
  - Resultado: sucesso; branch atual confirmada como `feature/prd-usuario-legivel-immutavel-historico-licencas`.
- `rtk git status --short`
  - Resultado: sucesso; alteracoes da task presentes em entidades, testes e migration. Tambem ha diretorios nao rastreados fora do escopo desta validacao.
- `rtk git diff --check`
  - Resultado: sucesso; nenhum problema de whitespace no diff.
- `rtk rg -n "spotless|checkstyle|pmd|fmt|formatter|maven-checkstyle" services/arrecadacao-api/pom.xml services/arrecadacao-api -g 'pom.xml'`
  - Resultado: nenhum plugin de lint/format/checkstyle encontrado nos POMs analisados.
- `rtk mvn -pl services/arrecadacao-api/arrecadacao-domain test`
  - Resultado: falhou por selecao incorreta de modulo a partir da raiz do repositorio: `Could not find the selected project in the reactor`. Comando repetido no diretorio correto.
- `rtk mvn -pl arrecadacao-domain test` em `services/arrecadacao-api`
  - Resultado: sucesso; 77 testes executados, 0 falhas, 0 erros, 1 skipped.
- `rtk mvn -pl arrecadacao-domain clean test` em `services/arrecadacao-api`
  - Resultado: sucesso; recompilou 36 fontes e 9 fontes de teste; 77 testes executados, 0 falhas, 0 erros, 1 skipped.
- `rtk mvn -pl arrecadacao-infra -am -DskipTests compile` em `services/arrecadacao-api`
  - Resultado: bloqueado por dependencia privada. Falha ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0` no GitHub Packages com `401 Unauthorized`.
- `source .env && rtk mvn -pl arrecadacao-infra -am -DskipTests compile` em `services/arrecadacao-api`
  - Resultado: bloqueado novamente pelo mesmo `401 Unauthorized` ao resolver `br.org.ecad.audit:audit-sdk-core:1.0.0`.

Evidencia do bloqueio:

```text
Could not transfer artifact br.org.ecad.audit:audit-sdk-core:pom:1.0.0
from/to github-ecad-auditoria
authentication failed ... status: 401 Unauthorized
```

## Resultado do review tecnico

Status: APROVADO

Itens verificados contra task, PRD e techspec:

- Migration `V14__add_actor_snapshot_to_arrecadacao_history.sql` criada.
- Colunas novas adicionadas como nullable em:
  - `historico_status_licenca`: `ator_subject`, `autor_rotulo`
  - `historico_status_usuario`: `ator_subject`, `autor_rotulo`
  - `uda_valor`: `criado_por_subject`, `criado_por_rotulo`
  - `pagamento`: `estornado_por_subject`, `estornado_por_rotulo`
- Indices parciais por `*_subject` criados com `WHERE ... IS NOT NULL`.
- Nao ha `NOT NULL`, `UPDATE`, backfill ou alteracao de registros existentes na migration.
- Entidades JPA afetadas expoem getters para subject e rotulo congelado.
- Factories/metodos novos recebem subject e rotulo, validam valores em branco, gravam o rotulo no campo legado e preservam chamadas antigas com snapshot nulo.
- Testes unitarios cobrem compatibilidade legada, persistencia dos novos campos e rejeicao de subject/rotulo em branco nos novos fluxos.

Skills aplicadas na revisao:

- `java-architecture`: mantida a mudanca no escopo de dominio/infra indicado pela task.
- `java-code-quality`: sem defeitos bloqueantes nos trechos alterados; foram preservados padroes existentes do modulo.
- `java-testing`: testes unitarios relevantes foram adicionados e passaram com recompilacao limpa.
- `java-production-readiness`: Flyway versionado e sem backfill; compilacao de `infra` nao pode ser concluida por credencial privada.

## Achados

Nenhum defeito de implementacao encontrado na task 1.0.

## Riscos e bloqueios

- A compilacao que inclui `arrecadacao-infra` e qualquer validacao de Flyway integrada ficaram bloqueadas por credencial/dependencia privada (`401 Unauthorized` no GitHub Packages para `audit-sdk-core:1.0.0`). Isso impede confirmar, neste ambiente, a compilacao completa do modulo `infra` e a aplicacao automatizada da migration em teste de integracao.
- Existe 1 teste skipped em `PagamentoTest`, ja presente no conjunto executado. Nao foi identificado como regressao desta task.

## Recomendacao final

APROVADA

A implementacao atende aos criterios da task 1.0 dentro do que foi possivel validar localmente. O risco registrado e operacional/ambiental por credencial privada, nao um defeito identificado no codigo revisado.
