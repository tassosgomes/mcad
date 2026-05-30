# Especificação Técnica — Usuário legível e imutável nos históricos da Arrecadação

## Resumo Executivo

A solução introduz um modelo único de "ator histórico" no serviço `arrecadacao-api`, sem alterar autenticação, IdP ou `identity-sync-api`. Novas ações que hoje gravam `autor`, `criado_por` ou `estornado_por` passarão a gravar também o `subject` imutável do IdP e um rótulo humano congelado no momento da ação. Os campos legados permanecem no contrato para compatibilidade e devem receber o mesmo rótulo humano quando houver novos registros.

As leituras serão enriquecidas com um objeto `ator`/`criadoPorAtor`/`estornadoPorAtor`, contendo `label`, `subject` e `status` atual conhecido (`ATIVO`, `SUSPENSO`, `REMOVIDO`, `DESCONHECIDO`). O status vem da projeção local `arrecadacao.usuarios_identidade`, já alimentada por eventos `identity.user.*`; não haverá chamada síncrona ao IdP. Históricos antigos continuam funcionando usando fallback pelos campos legados.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **API layer (`arrecadacao-api`)**: substitui extrações locais de autor em controllers por um componente compartilhado `CurrentActorResolver`, responsável por ler `JwtAuthenticationToken`/`Authentication`.
- **Application layer (`arrecadacao-application`)**: recebe `ActorSnapshot` nos commands de escrita e usa `ActorDisplayResolver` nas queries para montar DTOs compatíveis e enriquecidos.
- **Domain layer (`arrecadacao-domain`)**: entidades com histórico passam a persistir campos de ator sem conhecer Spring Security ou IdP.
- **Infra layer (`arrecadacao-infra`)**: implementa `IdentityUserLookup` via `JdbcTemplate` sobre `arrecadacao.usuarios_identidade`.
- **Frontend (`frontend/src/features/arrecadacao`)**: usa um componente reutilizável `ActorDisplay` para exibir `Nome (login)` com badge textual de status quando disponível.

Fluxo de escrita: request autenticada -> `CurrentActorResolver` -> command com `ActorSnapshot` -> handler persiste entidade/histórico com `subject` e `label` congelados.

Fluxo de leitura: query carrega registros -> `ActorDisplayResolver` recebe `subject` e fallback legado -> consulta projeção local -> retorna DTO enriquecido -> UI renderiza `ActorDisplay`.

## Design de Implementação

### Interfaces Principais

```java
public record ActorSnapshot(
    String subject,
    String label,
    String username,
    String displayName,
    String email
) {}
```

```java
public interface IdentityUserLookup {
    Optional<IdentityUserProjection> findBySubject(String subject);
}
```

```java
public interface ActorDisplayResolver {
    ActorDisplayResponse resolve(String subject, String legacyLabel);
    ActorSnapshot snapshotFrom(CurrentActor actor);
}
```

```java
public record ActorDisplayResponse(
    String subject,
    String label,
    String username,
    String displayName,
    String email,
    String status
) {}
```

`CurrentActorResolver` fica no módulo API, pois depende de Spring Security. Ele deve extrair:

- `subject`: claim `sub`; fallback `Authentication.getName()`.
- `username`: claim `preferred_username`; fallback nulo.
- `displayName`: claim `name`; fallback nulo.
- `email`: claim `email`; fallback nulo.

`ActorDisplayResolver` fica na aplicação e usa `IdentityUserLookup` para preferir dados sincronizados. O rótulo congelado deve seguir `displayName + " (" + username + ")"`, depois `username`, depois `email`, depois `subject`/fallback legado.

### Modelos de Dados

Criar migration `V14__add_actor_snapshot_to_arrecadacao_history.sql`.

Colunas novas:

- `historico_status_licenca`
  - `ator_subject VARCHAR(128)`
  - `autor_rotulo VARCHAR(512)`
- `historico_status_usuario`
  - `ator_subject VARCHAR(128)`
  - `autor_rotulo VARCHAR(512)`
- `uda_valor`
  - `criado_por_subject VARCHAR(128)`
  - `criado_por_rotulo VARCHAR(512)`
- `pagamento`
  - `estornado_por_subject VARCHAR(128)`
  - `estornado_por_rotulo VARCHAR(512)`

Índices recomendados:

- `ix_hist_licenca_ator_subject` em `historico_status_licenca(ator_subject)` onde não nulo.
- `ix_hist_usuario_ator_subject` em `historico_status_usuario(ator_subject)` onde não nulo.
- `ix_uda_valor_criado_por_subject` em `uda_valor(criado_por_subject)` onde não nulo.
- `ix_pagamento_estornado_por_subject` em `pagamento(estornado_por_subject)` onde não nulo.

Não adicionar `NOT NULL`, porque registros antigos e seeds não terão snapshot. Não atualizar dados existentes.

Entidades afetadas:

- `HistoricoStatusLicenca`: adicionar `atorSubject`, `autorRotulo`.
- `HistoricoStatusUsuario`: adicionar `atorSubject`, `autorRotulo`.
- `UdaValor`: adicionar `criadoPorSubject`, `criadoPorRotulo`.
- `Pagamento`: adicionar `estornadoPorSubject`, `estornadoPorRotulo`.

DTOs afetados:

- `HistoricoStatusLicencaResponse`: manter `autor`; adicionar `ActorDisplayResponse ator`.
- `HistoricoStatusResponse`: manter `autor`; adicionar `ActorDisplayResponse ator`.
- `UdaResponse`: manter `criadoPor`; adicionar `ActorDisplayResponse criadoPorAtor`.
- `PagamentoResponse`: manter `estornadoPor`; adicionar `ActorDisplayResponse estornadoPorAtor`.

Campos legados devem receber o rótulo novo para registros novos. Para registros antigos, o DTO deve expor `autor`/`criadoPor`/`estornadoPor` como hoje e montar `ActorDisplayResponse` com `status = "DESCONHECIDO"` quando não houver `subject`.

### Endpoints de API

Não criar endpoints novos. Contratos existentes recebem campos opcionais adicionais:

- `GET /api/v1/licencas/{id}/historico-status`
- `GET /api/v1/usuarios-musica/{id}/historico-status`
- `GET /api/v1/uda/vigente`
- `GET /api/v1/uda/historico`
- `GET /api/v1/pagamentos`
- `GET /api/v1/pagamentos/{id}`

Exemplo compatível:

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

## Pontos de Integração

A integração externa já existe: `identity-sync-api` publica eventos `identity.user.*` no exchange `identity.events`; Arrecadação consome pela fila `arrecadacao.identity.users` e mantém `arrecadacao.usuarios_identidade`.

Esta feature não muda o contrato desses eventos. A nova leitura usa a projeção local:

- `logto_user_id` como chave de busca por `subject`.
- `username`, `display_name`, `email` para exibição quando o rótulo congelado não existir.
- `is_suspended` e `deleted_at_utc` para status atual.

Mapeamento de status:

- `deleted_at_utc IS NOT NULL` -> `REMOVIDO`.
- `is_suspended = true` -> `SUSPENSO`.
- registro encontrado e ativo -> `ATIVO`.
- sem `subject` ou sem projeção -> `DESCONHECIDO`.

Falhas de lookup devem degradar para fallback legado e logar `WARN`; nenhuma escrita ou leitura histórica deve falhar por indisponibilidade da projeção.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
| ------------------ | --------------- | --------------------------- | -------------- |
| `arrecadacao` schema | Migração compatível | Adiciona colunas nullable e índices. Risco baixo/médio por tocar tabelas operacionais. | Criar `V14`, validar Flyway e rollback manual documentado. |
| Commands de Licença/Usuário/UDA/Pagamento | Mudança interna | Troca `String autor` por `ActorSnapshot` ou adiciona campo novo ao command. Risco médio por muitos handlers. | Refatorar handlers e testes unitários juntos. |
| DTOs REST | Mudança API compatível | Adiciona objetos opcionais sem remover campos antigos. Risco baixo. | Atualizar tipos TypeScript e testes de contrato. |
| Frontend Arrecadação | Exibição | Substitui renderização direta de strings por `ActorDisplay`. Risco baixo. | Criar componente compartilhado e aplicar nos quatro pontos. |
| `usuarios_identidade` | Reuso read-only | Nova consulta por `logto_user_id`. Risco baixo. | Adicionar método em `IdentityUserProjectionRepository`/novo adapter. |
| Auditoria | Sem mudança obrigatória | Audit events já usam `AuditContext` com `sub`, username e displayName. | Manter comportamento, opcionalmente mapear novos campos nos snapshots auditáveis. |

## Abordagem de Testes

### Testes Unitários

- `ActorDisplayResolverTest`: formato `Nome (login)`, fallback para login/e-mail/subject, status `ATIVO`/`SUSPENSO`/`REMOVIDO`/`DESCONHECIDO`.
- `CurrentActorResolverTest`: JWT completo, JWT sem `preferred_username`, autenticação mock sem JWT e usuário sistema.
- Handlers de escrita:
  - `CriarLicencaCommandHandlerTest`, transições de licença, status de usuário, `AjustarUdaCommandHandlerTest`, `EstornarPagamentoCommandHandlerTest`.
  - Verificar persistência de `subject`, `rotulo` e manutenção do campo legado.
- Query handlers:
  - Histórico de licença/usuário, UDA vigente/histórico, pagamento list/detail.
  - Verificar fallback quando registro antigo não possui `subject`.

### Testes de Integração

Adicionar/ajustar testes em `services/arrecadacao-api/arrecadacao-tests`:

- Migration Flyway aplica `V14` em banco limpo.
- `IdentityUserProjectionRepository` busca usuário por `logto_user_id`.
- Endpoints de histórico retornam campos legados e objeto `ator`.
- Endpoint de pagamento estornado retorna `estornadoPor` e `estornadoPorAtor`.
- Endpoint de UDA retorna `criadoPor` e `criadoPorAtor`.

Frontend:

- Testes de componente para `ActorDisplay`.
- Testes das timelines de Licenças e Usuários de Música.
- Testes de `UdaHistoricoTable`, `UdaVigenteCard` e `PagamentoDetailPage`.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. Criar migration `V14` com colunas nullable e índices. Isso estabiliza o modelo antes da aplicação.
2. Adicionar records/ports de ator em `arrecadacao-application` e adapter JDBC em `arrecadacao-infra`.
3. Implementar `CurrentActorResolver` no módulo API e substituir extrações duplicadas nos controllers.
4. Atualizar commands, handlers e entidades para gravar `ActorSnapshot`.
5. Atualizar query handlers e DTOs para retornar `ActorDisplayResponse`.
6. Atualizar tipos TypeScript e criar `ActorDisplay` reutilizável.
7. Aplicar `ActorDisplay` em Licenças, Usuários de Música, UDA e Pagamento/Estorno.
8. Completar testes unitários, integração e frontend.

### Dependências Técnicas

- `identity-sync-api` e consumidor `IdentityUserEventListener` devem continuar ativos para status e dados atuais.
- A feature não bloqueia caso `usuarios_identidade` esteja vazio; usa fallback legado.
- Não há nova biblioteca obrigatória.

## Monitoramento e Observabilidade

Usar logs estruturados existentes do Spring:

- `INFO` quando `CurrentActorResolver` cair para autenticação sem JWT em escrita humana.
- `WARN` quando `ActorDisplayResolver` receber `subject` mas não encontrar projeção.
- `DEBUG` opcional para resolução bem-sucedida, sem logar e-mail em massa.

Métricas Prometheus futuras, se houver registry disponível no serviço:

- `arrecadacao_actor_resolution_total{result="found|missing|legacy|error"}`
- `arrecadacao_actor_snapshot_write_total{target="licenca|usuario|uda|pagamento"}`

Não criar dependência de dashboard nesta entrega. A verificação operacional primária é via endpoint e banco.

## Considerações Técnicas

### Decisões Principais

- Persistir `subject` e `label` congelado nos registros novos: atende imutabilidade sem reprocessar histórico.
- Resolver status atual no momento da leitura: evita congelar informação operacional de suspensão/remoção e aproveita `usuarios_identidade`.
- Manter campos legados (`autor`, `criadoPor`, `estornadoPor`): reduz risco para UI e consumidores existentes.
- Não consultar IdP em runtime: evita acoplamento, latência e falhas externas em telas de histórico.

Alternativa rejeitada: somente enriquecer em leitura usando `autor` atual. Isso falha para históricos antigos com GUID e não garante imutabilidade do rótulo exibido.

### Riscos Conhecidos

- `Authentication.getName()` pode não ser o `sub` em todos os fluxos atuais. Mitigação: centralizar extração em `CurrentActorResolver` e preferir claim `sub`.
- Histórico antigo sem `subject` não terá status de usuário. Mitigação: exibir valor legado com status `DESCONHECIDO`.
- Refatorar commands pode gerar regressão ampla. Mitigação: manter construtores/records claros e cobrir handlers críticos.
- `autor` em `HistoricoStatusLicenca` hoje não valida null. Mitigação: corrigir guarda ao alterar factory.

### Requisitos Especiais

- Performance: resolver autores em lote nas queries de lista/histórico para evitar N+1. `ActorDisplayResolver` deve aceitar coleção ou usar cache local por request quando houver múltiplos registros.
- Segurança: não adicionar permissões novas; endpoints seguem `@RequiresPermission`.
- Privacidade: e-mail só aparece como fallback quando nome/login não existirem, conforme PRD.

### Conformidade com Padrões

- Segue Clean Architecture Maven multi-module descrita em `CLAUDE.md`: API extrai contexto HTTP, Application orquestra casos de uso, Domain persiste estado, Infra acessa banco.
- Mantém linguagem de domínio em português e API `/api/v1`.
- Usa Spring Boot 3.3, Java 21, JPA/JdbcTemplate e Flyway já existentes.
- Não cria dependência externa nova; reutiliza `identity-sync-api`, RabbitMQ e projeção local existentes.
- Mantém compatibilidade REST adicionando campos opcionais.
- Testes seguem JUnit 5, AssertJ, Mockito e Testcontainers já configurados no módulo Arrecadação.
