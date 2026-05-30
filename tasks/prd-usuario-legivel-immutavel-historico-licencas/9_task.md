---
status: pending
parallelizable: false
blocked_by: ["4.0", "5.0", "6.0", "8.0"]
---

<task_context>
<domain>arrecadacao/validation</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database|http_server</dependencies>
<unblocks>"release"</unblocks>
</task_context>

# Tarefa 9.0: Testes integrados, contrato, observabilidade e validacao final

## Relacionada as User Stories

- [HU-01] Historicos exibem autor humano
- [HU-02] Historicos permanecem compreensiveis
- [HU-03] Identidade imutavel e preservada
- [HU-04] Falha/atraso da sincronizacao nao bloqueia operacao

## Visao Geral

Consolidar a validacao ponta a ponta da feature. Esta tarefa garante que migration, escrita, leitura, UI, fallbacks, compatibilidade e logs estejam coerentes antes de iniciar implementacao ou release.

## Requisitos

- Validar Flyway V14 em banco limpo e com dados existentes.
- Adicionar/ajustar testes de integracao em `services/arrecadacao-api/arrecadacao-tests`.
- Validar endpoints de Licencas, Usuarios de Musica, UDA e Pagamento.
- Validar que historicos antigos nao sao alterados automaticamente.
- Validar fallback quando `usuarios_identidade` esta vazio.
- Validar status `ATIVO`, `SUSPENSO`, `REMOVIDO` e `DESCONHECIDO`.
- Validar frontend com payload novo e legado.
- Conferir logs `INFO`/`WARN` definidos na Tech Spec.
- Atualizar documentacao tecnica minima se houver contrato OpenAPI/README local afetado.

## Subtarefas

- [ ] 9.1 Teste Flyway: migration aplica em banco limpo.
- [ ] 9.2 Teste de compatibilidade: migration nao altera registros antigos e permite colunas nulas.
- [ ] 9.3 Teste de repository/lookup: busca usuario por `logto_user_id` e calcula status.
- [ ] 9.4 Teste endpoint Licencas: `autor` legado + `ator` enriquecido.
- [ ] 9.5 Teste endpoint Usuarios de Musica: `autor` legado + `ator` enriquecido.
- [ ] 9.6 Teste endpoints UDA: `criadoPor` + `criadoPorAtor`.
- [ ] 9.7 Teste endpoints Pagamento: `estornadoPor` + `estornadoPorAtor`.
- [ ] 9.8 Teste de falha/missing lookup: leitura retorna fallback e nao falha.
- [ ] 9.9 Rodar unit tests backend dos resolvers, handlers e entidades afetadas.
- [ ] 9.10 Rodar testes frontend de `ActorDisplay` e telas atualizadas.
- [ ] 9.11 Rodar build/typecheck/lint aplicavel do backend e frontend.
- [ ] 9.12 Atualizar documentacao de contrato se o projeto mantiver OpenAPI ou README de endpoints.

## Sequenciamento

- Bloqueado por: 4.0, 5.0, 6.0, 8.0
- Desbloqueia: release
- Paralelizavel: Nao (consolidacao final depende das trilhas implementadas)

## Rastreabilidade

- Esta tarefa cobre as metricas de sucesso do PRD: novos eventos com subject, novos eventos com label humano, historicos antigos intactos e telas resilientes quando a resolucao nao encontra usuario.
- Evidencia esperada: relatorio de comandos executados, testes verdes e eventuais riscos residuais documentados.

## Detalhes de Implementacao

Cenarios minimos de contrato:

1. Novo historico com usuario sincronizado ativo retorna `label = "Nome (login)"` e `status = "ATIVO"`.
2. Novo historico com usuario suspenso retorna rotulo congelado e `status = "SUSPENSO"`.
3. Novo historico com usuario removido retorna rotulo congelado e `status = "REMOVIDO"`.
4. Novo historico sem projecao retorna rotulo congelado e `status = "DESCONHECIDO"`.
5. Historico antigo sem subject retorna campo legado e nao e alterado no banco.
6. Falha de lookup nao quebra endpoint nem operacao de escrita.

Comandos provaveis de validacao, ajustando conforme modulo e perfil local:

```bash
rtk ./mvnw -B -ntp test
rtk ./mvnw -B -ntp -pl services/arrecadacao-api/arrecadacao-tests test
rtk npm --prefix frontend test
rtk npm --prefix frontend run build
```

## Criterios de Sucesso

- Migration e testes de integracao passam.
- Endpoints afetados retornam campos novos sem remover campos legados.
- UI exibe atores humanos e status em todos os pontos previstos.
- Historicos antigos permanecem inalterados.
- Falhas de resolucao degradam para fallback com log apropriado.
