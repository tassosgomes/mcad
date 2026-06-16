---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>arrecadacao/application/events</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<risk>medium</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>unit</validation_level>
<context_budget>medium</context_budget>
<dependencies>database</dependencies>
<unblocks>"2.0, 3.0"</unblocks>
</task_context>

# Tarefa 1.0: Arrecadação — Publicar eventos de Usuário de Música no Outbox

## Visão Geral

A Arrecadação hoje publica eventos de auditoria para Usuário de Música, mas **nenhum evento de integração** no Outbox/RabbitMQ. Esta tarefa adiciona a publicação de `arrecadacao.usuario-musica.criado` e `arrecadacao.usuario-musica.atualizado` nos 4 handlers de comando, replicando o padrão já consagrado dos handlers de Rubrica.

Cobre **RF-01** do PRD. Desbloqueia as tasks de consumer (3.0) e backfill (2.0).

## Requisitos

- RF-01: evento CloudEvents gravado no Outbox na mesma transação do comando, em criar/atualizar/ativar/inativar.
- Payload "fat" (snapshot completo do UsuarioMusica) para reuso por múltiplos consumidores.
- Routing key = tipo do evento (já é o comportamento de `OutboxEvent.criar`).

## Subtarefas

- [ ] 1.1 Criar `UsuarioMusicaIntegrationEventMapper` (mapper estático `UsuarioMusica → Map<String,Object>`)
- [ ] 1.2 Injetar `OutboxEventWriter` em `CriarUsuarioMusicaCommandHandler` e publicar `arrecadacao.usuario-musica.criado`
- [ ] 1.3 Injetar `OutboxEventWriter` em `AtualizarUsuarioMusicaCommandHandler` e publicar `arrecadacao.usuario-musica.atualizado`
- [ ] 1.4 Injetar `OutboxEventWriter` em `AtivarUsuarioMusicaCommandHandler` e publicar `arrecadacao.usuario-musica.atualizado`
- [ ] 1.5 Injetar `OutboxEventWriter` em `InativarUsuarioMusicaCommandHandler` e publicar `arrecadacao.usuario-musica.atualizado`
- [ ] 1.6 Testes unitários dos 4 handlers (verificar `outboxEventWriter.addEvent`)
- [ ] 1.7 Teste unitário do mapper
- [ ] 1.8 Teste de integração `UsuarioMusicaEventOutboxIT` (clone do `RubricaEventOutboxIT`)

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0
- Paralelizável: Não (primeira task; eventos devem existir no broker)

## Detalhes de Implementação

**Skill de referência:** `java-testing` (JUnit 5 + AssertJ + Mockito, naming `method_Condition_ExpectedBehavior`, AAA).

**Mapper — schema do payload (TechSpec §Contrato de Evento):**
```java
public static Map<String, Object> toPayload(UsuarioMusica u) {
    Map<String, Object> p = new HashMap<>();
    p.put("id", u.getId().toString());
    p.put("razaoSocial", u.getRazaoSocial());
    p.put("nomeFantasia", u.getNomeFantasia());
    p.put("cnpj", u.getCnpj().getValor());
    p.put("cnpjFormatado", u.getCnpj().getFormatado());
    p.put("status", u.getStatus().name());
    p.put("criadoEm", u.getCriadoEm().toString());
    p.put("atualizadoEm", u.getAtualizadoEm().toString());
    return p;
}
```
> Endereço e contato NÃO são incluídos nesta versão (ver TechSpec §Contrato de Evento).

**Molde exato a replicar:** `CriarRubricaCommandHandler.publicarEvento()` — injeta `OutboxEventWriter`, chama `outboxEventWriter.addEvent(type, subject, payloadMap)` **após** `repository.save`, dentro do `@Transactional` existente.

**Subject** = `saved.getId().toString()`.

**Asserção de teste (padrão Rubrica):**
```java
verify(outboxEventWriter).addEvent(eq("arrecadacao.usuario-musica.criado"), anyString(), anyMap());
```

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Contrato de Evento, §Componente — Produtor, §Inventário (Arrecadação)
- Código existente: `CriarRubricaCommandHandler.java`, `AtualizarRubricaCommandHandler.java` (molde outbox)
- Código existente: `OutboxEventWriter.java` (interface), `OutboxEventWriterImpl.java`
- Código existente: `UsuarioMusica.java`, `Cnpj.java` (campos do payload)
- Teste existente: `CriarRubricaCommandHandlerTest.java` (molde de asserção)

### Contexto Útil

- `OutboxEvent.criar(type, subject, payload)` já define `routingKey = type`.
- O `RabbitMqPublisher` envia para exchange `arrecadacao.events` com a routing key — sem mudança necessária.

### Pontos Críticos

- A publicação deve ocorrer **após** `repository.save` e **dentro** do `@Transactional` (garantia atômica do Outbox).
- Não usar `usuarioMap` do audit factory — o payload de integração é distinto (campo `cnpjFormatado`, `status`, timestamps).
- Os handlers atuais não recebem `OutboxEventWriter` no construtor — adicionar a dependência.

### Fora de Escopo

- Endpoint de backfill (task 2.0).
- Consumer na Identificação (task 3.0).
- Não publicar endereço/contato no payload.

## Criterios de Sucesso

- `mvn -pl arrecadacao-application test` verde com novos testes dos 4 handlers + mapper.
- `mvn -pl arrecadacao-tests test -Dtest="UsuarioMusicaEventOutboxIT"` valida evento no Outbox com tipo e payload corretos.
- Criar um UsuarioMusica gera exatamente 1 evento `arrecadacao.usuario-musica.criado`; atualizar/ativar/inativar gera `arrecadacao.usuario-musica.atualizado`.
- Payload contém `id`, `razaoSocial`, `cnpj`, `cnpjFormatado`, `status`.
