---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>plataforma/migration/authz-assignments</domain>
<type>implementation</type>
<scope>data_migration</scope>
<complexity>high</complexity>
<dependencies>logto,ecad-authz,seeds,env_qa</dependencies>
<unblocks>4.0, 8.0</unblocks>
</task_context>

# Tarefa 3.0: Criar migracao controlada de roles Logto para assignments `ecad-authz`

## Relacionada as User Stories

- Administrador de Plataforma remove roles do IdP sem perda funcional.
- Auditor recebe relatorio defensavel de antes/depois.
- Usuario MCAD preserva acesso esperado durante a migracao.

## Visao Geral

Criar script idempotente para exportar roles atuais do Logto, mapear para `seeds/mcad/roles.json`, criar assignments oficiais no `ecad-authz` com ator tecnico `migration` e gerar relatorio de dry-run/apply/validacao.

## Requisitos

- Suportar `--dry-run`, `--apply` e geracao de relatorio.
- Usar `seeds/mcad/roles.json` como catalogo oficial.
- Nunca migrar role sem mapeamento silenciosamente.
- Comparar permissao efetiva antes/depois para usuarios obrigatorios de `.env_qa` e perfis criticos.
- Ser idempotente: reexecucao nao duplica assignments.
- Nao registrar senha, token, segredo M2M ou conteudo sensivel de `.env_qa`.

## Arquivos Envolvidos

- **Criar:**
  - `scripts/migrate-logto-roles-to-authz-assignments.mjs` ou `.sh`
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/migration-report.example.md`
  - Testes ou fixtures do script quando aplicavel
- **Modificar:**
  - `.env.example` se novas variaveis forem necessarias
  - `README.md` ou documentacao operacional de authz
- **Referencia:**
  - `scripts/seed-authz.sh`
  - `seeds/mcad/roles.json`
  - `seeds/mcad/assignments.json`
  - `.env_qa`

## Subtarefas

- [ ] 3.1 Definir variaveis de entrada: URL Logto, token Management API, URL `ecad-authz`, token admin e caminho do catalogo.
- [ ] 3.2 Exportar usuarios e roles do Logto sem gravar tokens em disco.
- [ ] 3.3 Resolver cada role exportada contra `seeds/mcad/roles.json`.
- [ ] 3.4 Gerar relatorio dry-run com totais, assignments planejados, roles sem mapeamento e usuarios sem role.
- [ ] 3.5 Implementar `--apply` usando endpoints oficiais `POST /v1/users/{userId}/roles` ou equivalente.
- [ ] 3.6 Tratar `409`/assignment duplicado como sucesso idempotente com registro no relatorio.
- [ ] 3.7 Ler usuarios obrigatorios da `.env_qa` e validar contexto efetivo antes/depois sem exibir segredos.
- [ ] 3.8 Adicionar teste/fixture para role conhecida, role desconhecida e duplicidade.
- [ ] 3.9 Documentar procedimento de rollback: reter export Logto, relatorio e lista de assignments criados.

## Sequenciamento

- Bloqueado por: 1.0, 2.0
- Desbloqueia: 4.0, 8.0
- Paralelizavel: Nao. A migracao e gate de seguranca antes de remover roles/customizer do Logto.

## Rastreabilidade

- Cobre RF-02.
- Evidencia esperada: relatorio explicito de roles migradas, pendencias nao migradas e validacao `.env_qa`.

## Detalhes de Implementacao

O script deve preferir APIs oficiais em vez de acesso direto ao banco. O ator tecnico deve ser `migration` ou equivalente definido pelo `ecad-authz`, com `correlationId` no relatorio.

Estados minimos do relatorio:

```text
mode: dry-run|apply
usersScanned
rolesRecognized
rolesUnmapped
assignmentsPlanned
assignmentsCreated
assignmentsAlreadyExisting
validationUsers
blockingFindings
```

## Criterios de Sucesso Verificaveis

- [ ] `--dry-run` executa sem escrita e gera relatorio.
- [ ] Role sem mapeamento aparece como pendencia bloqueante e nao e migrada.
- [ ] `--apply` cria assignments reconhecidos via endpoints oficiais.
- [ ] Reexecucao de `--apply` nao duplica assignments.
- [ ] Usuarios `.env_qa` sao validados sem expor senha/token no output.
- [ ] Cutover fica bloqueado se houver role sem mapeamento ou perda de permissao esperada.
