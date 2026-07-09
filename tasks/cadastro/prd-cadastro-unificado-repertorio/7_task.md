---
status: pending
parallelizable: false
blocked_by: ["4.0", "6.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>documentation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>http_server, database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Executar o gate de contratos, documentar e validar o fluxo fim a fim

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (suporte de aceitação)
- [HU-04] Consultar o resultado (suporte de aceitação)

## Requisitos

- RF-18–RF-23 e Contract Gate: evidência integrada, contrato gerado, documentação e revisão de segurança/observabilidade.

## Arquivos Envolvidos

- **Modificar:**
  - `contracts/cadastro/openapi.json` (somente gerado por `scripts/export-contracts.sh`)
  - `docs/architecture/service-communication.md` (rota, permissão e semântica transacional)
- **Referência:**
  - `docs/local-development.md`
  - `scripts/export-contracts.sh`
  - `tasks/cadastro/prd-cadastro-unificado-repertorio/prd.md`
  - `tasks/cadastro/prd-cadastro-unificado-repertorio/techspec.md`
- **Skills:** dotnet-testing, dotnet-observability, dotnet-production-readiness, react-testing, react-production-readiness.

## Subtarefas

- [ ] 7.1 Executar todas as suítes .NET e frontend, registrar falhas reais e corrigir somente no escopo das tarefas anteriores.
- [ ] 7.2 Subir os serviços conforme `docs/local-development.md`, executar o Contract Gate e versionar exclusivamente o OpenAPI gerado alterado.
- [ ] 7.3 Documentar os três endpoints, a permissão, os resultados `201/400/409/422/502`, a decisão de ISWC antes da transação e ausência de entidade Repertório.
- [ ] 7.4 Revisar logs, métricas e traces: contadores, histograma, correlação, e ausência de CPF/CNPJ/CAE-IPI/payloads.
- [ ] 7.5 Executar checklist de aceitação dos fluxos: liberado, indisponível+retry, indisponível+pendente, rollback e acesso negado ao consultor.

## Sequenciamento

- Bloqueado por: 4.0 e 6.0.
- Desbloqueia: Nenhum; encerra a feature.
- Paralelizável: Não — depende das superfícies finais.

## Rastreabilidade

- Esta tarefa cobre: validação final de todos os RFs, com ênfase em RF-18–RF-23.
- Evidência esperada: comandos verdes, OpenAPI exportado e documentação atualizada.

## Detalhes de Implementação

Seguir o Contract Gate obrigatório do projeto: `./dev.sh start`, `scripts/export-contracts.sh`, `./dev.sh stop`; para apenas verificar, usar `--check`. Nunca editar `contracts/cadastro/openapi.json` manualmente. A documentação deve esclarecer que a atomicidade é local e que ISWC não tem retry automático nem transação distribuída.

**Convenções da stack:** PostgreSQL nas integrações; logs estruturados e sanitizados; telemetria em produção sem dados pessoais; testes determinísticos e limpos; validação de build/typecheck antes de entrega.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/Cadastro.sln` passa.
- [ ] `npm run test && npm run build` passam em `frontend/`.
- [ ] `./dev.sh start && scripts/export-contracts.sh --check && ./dev.sh stop` passa com infraestrutura disponível.
- [ ] `contracts/cadastro/openapi.json` contém os três endpoints e schemas gerados, sem edição manual.
- [ ] A documentação descreve a permissão, os status HTTP, o rollback e a decisão pendente.
