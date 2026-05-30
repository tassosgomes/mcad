---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0", "3.0"]
---

<task_context>
<domain>arrecadacao/usuarios-musica</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0, 9.0"</unblocks>
</task_context>

# Tarefa 5.0: Usuarios de Musica - gravacao e leitura enriquecida do historico de status

## Relacionada as User Stories

- [HU-01] Analista identifica o responsavel por mudancas de usuarios de musica
- [HU-02] Consultor consulta historico sem GUIDs
- [HU-03] Auditoria preserva identidade imutavel

## Visao Geral

Aplicar o snapshot de ator nos fluxos de Usuario de Musica que geram `HistoricoStatusUsuario` e enriquecer `GET /api/v1/usuarios-musica/{id}/historico-status` com o objeto `ator`, mantendo o campo legado `autor`.

## Requisitos

- Atualizar handlers que criam historico de status de Usuario de Musica.
- Persistir `ator_subject` e `autor_rotulo` em `HistoricoStatusUsuario`.
- Para novos registros, preencher `autor` com o rotulo humano congelado.
- Atualizar `HistoricoStatusResponse` com `ActorDisplayResponse ator`.
- Atualizar `ListarHistoricoStatusQueryHandler` para resolver ator.
- Historicos antigos sem `subject` devem continuar exibindo `autor` legado.
- Nao alterar regras funcionais de criacao, ativacao ou inativacao.

## Subtarefas

- [ ] 5.1 Atualizar metodos de dominio de `UsuarioMusica` que criam `HistoricoStatusUsuario`.
- [ ] 5.2 Atualizar `CriarUsuarioMusicaCommandHandler`, `InativarUsuarioMusicaCommandHandler` e `AtivarUsuarioMusicaCommandHandler`.
- [ ] 5.3 Verificar se `AtualizarUsuarioMusicaCommandHandler` gera historico; se gerar, aplicar snapshot tambem.
- [ ] 5.4 Ajustar testes unitarios dos handlers para verificar snapshot e campo legado.
- [ ] 5.5 Atualizar `HistoricoStatusResponse` com campo `ator`.
- [ ] 5.6 Atualizar `ListarHistoricoStatusQueryHandler` para usar `ActorDisplayResolver`.
- [ ] 5.7 Testar fallback de registro antigo sem `atorSubject`.

## Sequenciamento

- Bloqueado por: 1.0, 2.0, 3.0
- Desbloqueia: 8.0, 9.0
- Paralelizavel: Sim (trilha isolada de Usuarios de Musica apos a fundacao)

## Rastreabilidade

- Esta tarefa cobre o endpoint `GET /api/v1/usuarios-musica/{id}/historico-status` e os novos registros de status de Usuarios de Musica.
- Evidencia esperada: historico de usuario retorna `autor` e `ator` com status conhecido quando houver projecao.

## Detalhes de Implementacao

O comportamento de fallback deve ser o mesmo de Licencas:

- novo registro: `autor = actorSnapshot.label()`, `atorSubject = actorSnapshot.subject()`, `autorRotulo = actorSnapshot.label()`;
- registro antigo: `autor` segue valor historico existente e `ator.status = "DESCONHECIDO"` quando nao houver subject.

Use o mesmo resolver da task 2.0 para evitar divergencia entre endpoints.

## Criterios de Sucesso

- Novos historicos de Usuario de Musica persistem subject e rotulo congelado.
- Endpoint retorna `ator` e preserva `autor`.
- Fallback legado funciona para registros antigos.
- Testes unitarios cobrem criacao, inativacao e ativacao.
