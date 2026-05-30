---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/application-infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0, 4.0, 5.0, 6.0, 7.0"</unblocks>
</task_context>

# Tarefa 2.0: Modelos, ports e resolucao de exibicao de ator na Application/Infra

## Relacionada as User Stories

- [HU-01] Analista ve nome e login no historico
- [HU-02] Consultor nao precisa interpretar GUIDs
- [HU-04] Operacao continua funcionando quando sincronizacao esta atrasada

## Visao Geral

Criar o modelo unico de ator historico na camada de application e o adapter de consulta read-only para `arrecadacao.usuarios_identidade`. Esta tarefa concentra as regras de fallback, status atual conhecido e degradacao segura quando a projecao local nao encontra o usuario.

## Requisitos

- Criar `ActorSnapshot` com `subject`, `label`, `username`, `displayName` e `email`.
- Criar `ActorDisplayResponse` com `subject`, `label`, `username`, `displayName`, `email` e `status`.
- Criar port `IdentityUserLookup` e projection de usuario sincronizado.
- Criar `ActorDisplayResolver` na application.
- Implementar adapter JDBC na infra usando `logto_user_id` como chave de busca.
- Resolver rotulo preferindo dados sincronizados para snapshot quando disponiveis e respeitando fallback definido no PRD.
- Para leitura, preservar rotulo congelado do historico e usar a projecao apenas para complementar status/dados atuais.
- Mapear status: `REMOVIDO`, `SUSPENSO`, `ATIVO`, `DESCONHECIDO`.
- Evitar N+1 em listas: disponibilizar resolucao em lote ou cache local por chamada.
- Falha de lookup deve retornar fallback legado e logar `WARN`, sem quebrar leitura/escrita.

## Subtarefas

- [ ] 2.1 Criar package de ator em `arrecadacao-application` seguindo o padrao local de DTOs/services/ports.
- [ ] 2.2 Implementar records `ActorSnapshot`, `ActorDisplayResponse` e `IdentityUserProjection`.
- [ ] 2.3 Definir `IdentityUserLookup` com metodo por subject e metodo em lote/cache se necessario para historicos.
- [ ] 2.4 Implementar `ActorDisplayResolver` com `snapshotFrom(CurrentActor)` e `resolve(subject, legacyLabel)`.
- [ ] 2.5 Implementar regras de label: `displayName (username)`, depois `username`, depois `email`, depois `subject` ou fallback legado.
- [ ] 2.6 Implementar status a partir de `deleted_at_utc` e `is_suspended`.
- [ ] 2.7 Estender ou criar adapter JDBC na infra ao lado de `IdentityUserProjectionRepository`.
- [ ] 2.8 Garantir logs estruturados para missing/error sem logar e-mail em massa.
- [ ] 2.9 Testes unitarios de `ActorDisplayResolver` cobrindo todos os fallbacks e status.
- [ ] 2.10 Teste de infra/repository para consulta por `logto_user_id` quando houver suporte de teste de banco.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0, 4.0, 5.0, 6.0, 7.0
- Paralelizavel: Nao (fundacao compartilhada de resolucao)

## Rastreabilidade

- Esta tarefa cobre: fallback humano, status atual conhecido, reuso de `usuarios_identidade`, ausencia de chamada sincrona ao IdP e resiliencia quando a projecao falha.
- Evidencia esperada: suite de `ActorDisplayResolverTest` com cenarios de label/status e adapter consultando a projecao local.

## Detalhes de Implementacao

Interfaces da Tech Spec:

```java
public record ActorSnapshot(
    String subject,
    String label,
    String username,
    String displayName,
    String email
) {}

public interface IdentityUserLookup {
    Optional<IdentityUserProjection> findBySubject(String subject);
}

public record ActorDisplayResponse(
    String subject,
    String label,
    String username,
    String displayName,
    String email,
    String status
) {}
```

Priorize a projecao local `arrecadacao.usuarios_identidade` para compor snapshot em escrita quando ela estiver disponivel, mas nunca bloqueie a operacao caso esteja vazia. Em leitura, o `label` congelado no historico deve prevalecer sobre dados atuais para evitar mudanca retroativa.

## Criterios de Sucesso

- `ActorDisplayResolver` retorna label humano em todos os cenarios de fallback.
- Historico antigo sem `subject` retorna objeto de ator com `status = "DESCONHECIDO"` e label legado.
- Lookup ausente ou com erro degrada sem excecao para o chamador.
- Implementacao evita uma consulta por item quando uma lista tiver varios registros do mesmo ator.
