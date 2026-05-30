---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0", "3.0"]
---

<task_context>
<domain>arrecadacao/licencas</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0, 9.0"</unblocks>
</task_context>

# Tarefa 4.0: Licencas - gravacao e leitura enriquecida do historico de status

## Relacionada as User Stories

- [HU-01] Analista identifica o responsavel por mudanca de status de licenca
- [HU-02] Consultor valida ciclo de vida sem interpretar GUID
- [HU-03] Auditoria preserva identidade imutavel

## Visao Geral

Aplicar o snapshot de ator nos fluxos de Licenca que criam historico de status e enriquecer `GET /api/v1/licencas/{id}/historico-status` com o objeto `ator`, mantendo o campo legado `autor`.

## Requisitos

- Atualizar handlers de criar, suspender, reativar e encerrar licenca para usar `ActorSnapshot`.
- Persistir `ator_subject` e `autor_rotulo` em `HistoricoStatusLicenca`.
- Para novos registros, preencher `autor` com o mesmo rotulo congelado.
- Atualizar `HistoricoStatusLicencaResponse` adicionando `ActorDisplayResponse ator`.
- Atualizar `ListarHistoricoStatusLicencaQueryHandler` para resolver ator sem N+1.
- Historicos antigos sem `subject` devem manter `autor` legado e retornar `ator.status = "DESCONHECIDO"`.
- Manter ordenacao por data decrescente.

## Subtarefas

- [ ] 4.1 Atualizar metodos de dominio de `Licenca` que criam `HistoricoStatusLicenca` para receber snapshot/rotulo.
- [ ] 4.2 Atualizar `CriarLicencaCommandHandler`, `SuspenderLicencaCommandHandler`, `ReativarLicencaCommandHandler` e `EncerrarLicencaCommandHandler`.
- [ ] 4.3 Ajustar testes unitarios dos handlers para verificar `subject`, rotulo e campo legado `autor`.
- [ ] 4.4 Atualizar `HistoricoStatusLicencaResponse` com campo `ator`.
- [ ] 4.5 Atualizar `ListarHistoricoStatusLicencaQueryHandler` para usar `ActorDisplayResolver`.
- [ ] 4.6 Testar fallback de registro antigo sem `atorSubject`.
- [ ] 4.7 Validar serializacao JSON compativel: campo `autor` continua existindo.

## Sequenciamento

- Bloqueado por: 1.0, 2.0, 3.0
- Desbloqueia: 8.0, 9.0
- Paralelizavel: Sim (trilha isolada de Licencas apos a fundacao)

## Rastreabilidade

- Esta tarefa cobre o endpoint `GET /api/v1/licencas/{id}/historico-status` e todos os eventos de status de Licenca mencionados na Tech Spec.
- Evidencia esperada: novos historicos de licenca gravam snapshot; leitura retorna `autor` e `ator`.

## Detalhes de Implementacao

Resposta compativel esperada:

```json
{
  "autor": "Maria Silva (maria.silva)",
  "ator": {
    "subject": "logto-user-1",
    "label": "Maria Silva (maria.silva)",
    "username": "maria.silva",
    "displayName": "Maria Silva",
    "email": "maria@mcad.dev",
    "status": "ATIVO"
  }
}
```

Evite montar o label no query handler; ele deve delegar ao resolver compartilhado. O handler deve apenas informar `atorSubject` e fallback legado/congelado.

## Criterios de Sucesso

- Criacao e transicoes de licenca persistem `atorSubject` e `autorRotulo`.
- Campo legado `autor` recebe o rotulo humano em registros novos.
- Endpoint de historico de licenca retorna `ator` sem remover campos atuais.
- Registros antigos continuam visiveis com fallback legado.
