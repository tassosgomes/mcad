---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/application/commands</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<risk>low</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>unit</validation_level>
<context_budget>small</context_budget>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Arrecadação — Endpoint de backfill para snapshot

## Visão Geral

Endpoint de manutenção que itera todos os `UsuarioMusica` existentes e publica um evento `arrecadacao.usuario-musica.atualizado` no Outbox para cada um, permitindo que a Identificação popule sua projeção local no primeiro deploy. Reutilizável para re-sincronizações futuras. Análogo ao `OutboxSeedService` de Rubricas.

Cobre suporte ao **RF-02** (permite que a projeção seja populada com dados pré-existentes).

## Requisitos

- `POST /api/v1/usuarios-musica/manutencao/replicar-snapshot` gated por permissão de manutenção.
- Handler itera todos os UsuarioMusica via `UsuarioMusicaRepository` e publica `atualizado` para cada um (usando o mapper da task 1.0).
- Retorna contagem de eventos publicados.

## Subtarefas

- [ ] 2.1 Criar `ReplicarUsuariosMusicaSnapshotCommand` (record, sem params além do actor)
- [ ] 2.2 Criar `ReplicarUsuariosMusicaSnapshotCommandHandler` (itera `repository.findAll()`, publica via `OutboxEventWriter` + mapper da task 1.0)
- [ ] 2.3 Adicionar endpoint `POST /manutencao/replicar-snapshot` no `UsuarioMusicaController` com `@RequiresPermission` de manutenção
- [ ] 2.4 Teste unitário do handler (verifica N eventos publicados = N usuários)
- [ ] 2.5 Atualizar `UsuarioMusicaEndpointsIntegrationTest` para o novo endpoint

## Sequenciamento

- Bloqueado por: 1.0 (depende do `UsuarioMusicaIntegrationEventMapper`)
- Desbloqueia: 3.0 (backfill popula a projeção para testes do consumer)
- Paralelizável: Sim (após 1.0; roda em paralelo com 3.0)

## Detalhes de Implementação

**Skill de referência:** `java-testing` (Mockito + AssertJ).

**Handler:**
```java
@Component
public class ReplicarUsuariosMusicaSnapshotCommandHandler
        implements CommandHandler<ReplicarUsuariosMusicaSnapshotCommand, ReplicarSnapshotResponse> {

    private final UsuarioMusicaRepository repository;
    private final OutboxEventWriter outboxEventWriter;

    @Override
    @Transactional
    public ReplicarSnapshotResponse handle(ReplicarUsuariosMusicaSnapshotCommand cmd) {
        var usuarios = repository.findAll();
        int count = 0;
        for (UsuarioMusica u : usuarios) {
            outboxEventWriter.addEvent(
                "arrecadacao.usuario-musica.atualizado",
                u.getId().toString(),
                UsuarioMusicaIntegrationEventMapper.toPayload(u));
            count++;
        }
        return new ReplicarSnapshotResponse(count);
    }
}
```

> Verificar se `UsuarioMusicaRepository` já tem `findAll()`; se não, adicionar. Usar paginação se o volume for grande (a PoC é pequeno).

**Permissão:** reusar o padrão `@RequiresPermission("arrecadacao:default:cliente:editar")` ou uma chave de manutenção — alinhar com o catálogo `docs/authz/catalog/`.

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Backfill
- Código existente: `UsuarioMusicaController.java` (molde de endpoints + `@RequiresPermission`)
- Código existente: `OutboxSeedService.java` (precedente de seed para Rubricas)
- Task 1.0: `UsuarioMusicaIntegrationEventMapper` (reutilizar)

### Fora de Escopo

- Não implementar consumer (task 3.0).
- Não criar projection table (task 3.0).

## Criterios de Sucesso

- `POST /api/v1/usuarios-musica/manutencao/replicar-snapshot` retorna 200 com `{ "eventosPublicados": N }`.
- Cada UsuarioMusica existente gera exatamente 1 evento `arrecadacao.usuario-musica.atualizado` no Outbox.
- Teste unitário do handler verde: `verify(outboxEventWriter, times(N)).addEvent(eq("arrecadacao.usuario-musica.atualizado"), anyString(), anyMap())`.
