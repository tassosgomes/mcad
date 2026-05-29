---
status: pending
parallelizable: false
blocked_by: ["3.0", "4.0", "5.0", "6.0", "7.0"]
---

<task_context>
<domain>plataforma/cutover/authz</domain>
<type>testing</type>
<scope>production_readiness</scope>
<complexity>high</complexity>
<dependencies>qa,logto,ecad-authz,bff,frontend,observability</dependencies>
<unblocks></unblocks>
</task_context>

# Tarefa 8.0: Executar cutover, validacao QA, observabilidade e documentacao final

## Relacionada as User Stories

- Administrador de Plataforma remove roles do IdP sem perda funcional.
- Auditor tem evidencia antes/depois.
- Usuario MCAD recebe concessao/revogacao em ate 5 minutos.

## Visao Geral

Executar a validacao final e o cutover coordenado: seed/migracao, remocao definitiva de roles/customizer no Logto, testes de login real sem `roles`, validacao `.env_qa`, deny seguro, concessao dinamica, revogacao e documentacao operacional.

## Requisitos

- Validar usuario sem assignment: 403 em APIs protegidas e ausencia de acoes protegidas na UI.
- Validar novo assignment: acesso liberado sem relogin em ate 5 minutos.
- Validar remocao de assignment: acesso revogado em ate 5 minutos.
- Validar access token sem roles de negocio e sem scope `roles` com audience valida.
- Executar busca estatica final por usos funcionais de roles/scopes.
- Registrar evidencias QA e relatorio de migracao/cutover.
- Atualizar docs para operacao, rollback e troubleshooting.

## Arquivos Envolvidos

- **Criar/Modificar:**
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/cutover-report.md`
  - `docs/migracao-authz/guia-operacional.md` ou documento equivalente
  - `README.md` se o setup local mudar
  - Specs E2E/QA se houver suite aplicavel
- **Referencia:**
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/prd.md`
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/techspec.md`
  - Relatorio gerado pela Tarefa 3.0
  - `.env_qa`

## Subtarefas

- [ ] 8.1 Conferir que 1.0 a 7.0 estao concluidas, testadas e implantadas no ambiente alvo.
- [ ] 8.2 Executar migracao `--dry-run` e revisar pendencias bloqueantes.
- [ ] 8.3 Executar migracao `--apply` com ator tecnico `migration` e salvar relatorio.
- [ ] 8.4 Executar provisionamento Logto auth-only e confirmar ausencia de roles/customizer.
- [ ] 8.5 Rodar seed/fixtures explicitas de assignments para DEV/CI quando aplicavel.
- [ ] 8.6 Validar usuarios `.env_qa` antes/depois sem registrar segredos.
- [ ] 8.7 Testar login real com token sem `roles` e sem scope `roles`.
- [ ] 8.8 Testar usuario sem assignment em UI e APIs protegidas.
- [ ] 8.9 Testar concessao dinamica sem relogin e medir tempo ate refletir permissao.
- [ ] 8.10 Testar revogacao e medir tempo ate deny efetivo.
- [ ] 8.11 Conferir metricas/logs: roles ignoradas, requests de assignment, latencia e falhas de upstream.
- [ ] 8.12 Rodar busca estatica final por `roles`, `hasRole`, `scope`, `x-mcad-roles` e documentar excecoes diagnosticas.
- [ ] 8.13 Atualizar documentacao operacional, rollback e criterios de troubleshooting.
- [ ] 8.14 Consolidar `cutover-report.md` com evidencias, decisoes e pendencias.

## Sequenciamento

- Bloqueado por: 3.0, 4.0, 5.0, 6.0, 7.0
- Desbloqueia: Nenhuma tarefa tecnica; fecha a feature.
- Paralelizavel: Nao. E uma validacao coordenada de cutover.

## Rastreabilidade

- Cobre RF-07 e valida RF-01 a RF-06 ponta a ponta.
- Evidencia esperada: relatorio final com tokens sem roles, migracao validada e SLA de propagacao comprovado.

## Detalhes de Implementacao

Checklist minima de cutover:

```text
1. ecad-authz ignora roleKeys
2. identity-sync publica identidade pura
3. migracao dry-run sem bloqueantes
4. migracao apply concluida
5. Logto sem roles/customizer de negocio
6. BFF e UI usando permissoes efetivas
7. ai-orchestrator sem fallback por role/scope
8. QA sem assignment / concessao / revogacao aprovado
```

## Criterios de Sucesso Verificaveis

- [ ] Relatorio de migracao nao tem roles sem mapeamento pendentes.
- [ ] Token inspecionado nao contem `roles` de negocio nem scope `roles`.
- [ ] Usuario sem assignment recebe 403 em API protegida e nao ve acoes protegidas.
- [ ] Novo assignment libera acesso sem relogin em ate 5 minutos.
- [ ] Remocao revoga acesso em ate 5 minutos.
- [ ] `cutover-report.md` contem evidencias dos usuarios `.env_qa`, sem segredos.
- [ ] Busca estatica final nao encontra uso funcional de roles/scopes como autorizacao de negocio.
- [ ] Documentacao de operacao e rollback esta atualizada.
