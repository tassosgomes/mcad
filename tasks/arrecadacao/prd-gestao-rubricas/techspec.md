# Especificação Técnica — F06: Gestão de Rubricas

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F06
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-06-07

---

## Resumo Executivo

Esta feature expande a entidade `Rubrica` do domínio Arrecadação de um dado seedado (7 registros) para um CRUD completo com inativação. A implementação segue o padrão CQRS nativo (sem MediatR) já adotado no projeto, com Commands/Handlers na camada Application e Minimal API endpoints na camada API. A inativação é implementada como um flag `ativo` (boolean) que impede novas licenças e pagamentos, preservando histórico. Toda mutação publica o evento `arrecadacao.rubrica.atualizada` via Outbox Pattern para sincronização com o domínio Distribuição. O algoritmo de geração automática de sigla é implementado como um domain service puro (sem dependências externas), retornando uma sugestão que o usuário pode aceitar ou substituir.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                     │
│  • Tela de listagem (/arrecadacao/rubricas)                 │
│  • Formulário de criação com sugestão de sigla em tempo real│
│  • Modal de inativação/reativação com justificativa         │
└────────────────────┬────────────────────────────────────────┘
                     │ apiArrecadacaoClient
┌────────────────────▼────────────────────────────────────────┐
│  Arrecadacao API (Spring Boot)                              │
│  • RubricaController (REST endpoints)                         │
│  • CommandDispatcher / QueryDispatcher (CQRS nativo)          │
│  • SecurityConfig + @RequiresPermission                     │
└──────┬─────────────┬─────────────┬────────────────────────┘
       │             │             │
┌──────▼──┐   ┌─────▼────┐   ┌────▼─────┐
│Commands │   │ Queries  │   │  Events  │
│Handlers │   │Handlers  │   │  Outbox  │
└────┬────┘   └────┬─────┘   └────┬─────┘
     │             │              │
┌────▼─────────────▼──────────────▼────────────┐
│  Domain (Entities, Repositories, Services)  │
│  • Rubrica (entity + ativo)                 │
│  • RubricaRepository (+ save)               │
│  • SiglaSuggester (domain service)          │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│  Infra (JPA, Outbox, RabbitMQ)              │
│  • JpaRubricaRepository                     │
│  • OutboxEventWriter (eventos de rubrica)   │
│  • SpringDataRubricaRepository              │
└─────────────────────────────────────────────┘
                     │
                     │ arrecadacao.rubrica.atualizada
                     ▼
┌─────────────────────────────────────────────┐
│  Distribuição API (Spring Boot)             │
│  • RubricaEventListener (consumidor)        │
│  • RubricaEventHandler (upsert com ativo)   │
│  • Rubrica (entity + ativo)                 │
└─────────────────────────────────────────────┘
```

---

## Design de Implementação

### Interfaces Principais

**Domain — RubricaRepository (expandido)**

```java
public interface RubricaRepository {
    List<Rubrica> findAll();
    Optional<Rubrica> findBySigla(String sigla);
    Optional<Rubrica> findById(UUID id);
    Rubrica save(Rubrica rubrica);  // NOVO
    boolean existsBySigla(String sigla);  // NOVO
}
```

**Domain — SiglaSuggester (novo domain service)**

```java
public interface SiglaSuggester {
    String sugerir(String nome);
}
```

**Application — Commands**

```java
public record CriarRubricaCommand(
    String nome, 
    boolean exigeClassificacao, 
    String siglaSugerida, 
    ActorSnapshot actor
) implements Command<RubricaResponse>;

public record AtualizarRubricaCommand(
    UUID id, 
    String nome, 
    boolean exigeClassificacao, 
    ActorSnapshot actor
) implements Command<RubricaResponse>;

public record InativarRubricaCommand(
    UUID id, 
    String justificativa, 
    ActorSnapshot actor
) implements Command<RubricaResponse>;

public record AtivarRubricaCommand(
    UUID id, 
    String justificativa, 
    ActorSnapshot actor
) implements Command<RubricaResponse>;
```

### Modelos de Dados

**Entidade Rubrica (atualizada)**

```java
@Entity
@Table(
    name = "rubricas", 
    schema = "arrecadacao", 
    uniqueConstraints = @UniqueConstraint(
        name = "uq_rubricas_sigla", 
        columnNames = "sigla"
    )
)
public class Rubrica {
    @Id private UUID id;
    @Column(nullable = false, length = 20) private String sigla;
    @Column(nullable = false, length = 100) private String nome;
    @Column(name = "exige_classificacao", nullable = false) 
    private boolean exigeClassificacao;
    @Column(nullable = false) private boolean ativo;  // NOVO
    // getters, construtor, métodos de domínio
}
```

**DTOs de Request/Response**

```java
public record CriarRubricaRequest(
    @NotBlank @Size(min=3, max=100) String nome, 
    boolean exigeClassificacao,
    @Size(max=20) String sigla  // opcional, usa sugestão se null
);

public record AtualizarRubricaRequest(
    @NotBlank @Size(min=3, max=100) String nome, 
    boolean exigeClassificacao
);

public record InativarRubricaRequest(
    @NotBlank @Size(min=10, max=500) String justificativa
);

public record RubricaResponse(
    UUID id, 
    String sigla, 
    String nome, 
    boolean exigeClassificacao, 
    boolean ativo
);
```

**Migration**

```sql
-- V{next}__add_ativo_rubrica.sql
ALTER TABLE arrecadacao.rubricas 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_rubricas_ativo ON arrecadacao.rubricas(ativo);
```

### Endpoints de API

| Método | Path | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/v1/rubricas` | Listar todas as rubricas | `arrecadacao:default:rubrica:visualizar` |
| `GET` | `/api/v1/rubricas/{id}` | Detalhe de uma rubrica | `arrecadacao:default:rubrica:visualizar` |
| `POST` | `/api/v1/rubricas` | Criar nova rubrica | `arrecadacao:default:rubrica:criar` |
| `PUT` | `/api/v1/rubricas/{id}` | Atualizar nome/exigeClassificacao | `arrecadacao:default:rubrica:editar` |
| `POST` | `/api/v1/rubricas/{id}/inativar` | Inativar rubrica | `arrecadacao:default:rubrica:inativar` |
| `POST` | `/api/v1/rubricas/{id}/ativar` | Reativar rubrica | `arrecadacao:default:rubrica:editar` |

### Eventos CloudEvents

**Produzido por Arrecadação, consumido por Distribuição:**

```json
{
  "specversion": "1.0",
  "type": "arrecadacao.rubrica.atualizada",
  "source": "arrecadacao-api",
  "subject": "{rubricaId}",
  "data": {
    "sigla": "RADIO",
    "nome": "Rádio AM/FM",
    "exigeClassificacao": false,
    "ativo": true
  }
}
```

---

## Pontos de Integração

### Distribuição API (consumidor de eventos)

| Componente | Mudança |
|---|---|
| `RubricaEventPayload` | Adicionar campo `ativo` (boolean) |
| `RubricaEventHandler` | Atualizar `ativo` no upsert |
| `Rubrica` (entity) | Adicionar campo `ativo` |
| Migration | `ALTER TABLE distribuicao.rubricas ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE` |

### Validações em fluxos existentes

| Fluxo | Validação adicionada |
|---|---|
| `Licenca.criar()` | Verificar `rubrica.ativo == true`, senão `IllegalStateException` → 422 |
| `RegistrarPagamentoCommandHandler` | Verificar `licenca.getRubrica().isAtivo()`, senão 422 |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
|---|---|---|---|
| `arrecadacao.rubricas` (tabela) | Mudança de Esquema | Adiciona `ativo` (boolean, default true). Risco baixo. | Migration Flyway |
| `Rubrica` (entity) | Mudança de Modelo | Adiciona campo `ativo` + métodos. Risco baixo. | Atualizar entity |
| `RubricaRepository` | Mudança de Interface | Adiciona `save()` e `existsBySigla()`. Risco baixo. | Implementar em JpaRepository |
| `Licenca.criar()` | Mudança de Lógica | Validação de rubrica ativa. Risco médio (pode quebrar testes). | Ajustar testes |
| `RegistrarPagamentoCommandHandler` | Mudança de Lógica | Validação de rubrica ativa. Risco médio. | Ajustar testes |
| `permissions.yaml` (Arrecadação) | Mudança de Config | Novas permissões de rubrica. Risco baixo. | Registrar no authz |
| `RubricaController` | Mudança de API | Expande de 1 para 6 endpoints. Risco baixo. | Implementar novos endpoints |
| `distribuicao.rubricas` (tabela) | Mudança de Esquema | Adiciona `ativo`. Risco baixo. | Migration Flyway |
| `RubricaEventPayload` | Mudança de Contrato | Adiciona `ativo`. Risco baixo — campo novo, não quebra compatibilidade. | Atualizar payload |
| `frontend/src/features/arrecadacao` | Novo Módulo | CRUD completo de rubricas. Risco baixo. | Criar novo feature module |

---

## Abordagem de Testes

### Testes Unitários

| Componente | Cenários |
|---|---|
| `SiglaSuggester` | Nomes com/sem preposições, acentos, parênteses, palavras curtas |
| `CriarRubricaCommandHandler` | Criação com sigla sugerida, com sigla manual, sigla duplicada |
| `InativarRubricaCommandHandler` | Inativação de rubrica ativa, tentativa de inativar já inativa |
| `Rubrica` (domain) | `ativar()`, `inativar()`, getters |
| `Licenca.criar()` | Tentativa de criar com rubrica inativa → exception |

### Testes de Integração

| Cenário | Validação |
|---|---|
| `POST /api/v1/rubricas` | Criação completa, sigla gerada, evento outbox publicado |
| `POST /api/v1/rubricas` com sigla duplicada | HTTP 409, mensagem correta |
| `POST /api/v1/rubricas/{id}/inativar` | Status muda, licença posterior bloqueada |
| `POST /api/v1/rubricas/{id}/ativar` | Status muda, licença posterior permitida |
| `POST /api/v1/licencas` com rubrica inativa | HTTP 422 |
| `POST /api/v1/pagamentos` com licença de rubrica inativa | HTTP 422 |
| Consumo de evento na Distribuição | `RubricaEventHandler` atualiza `ativo` corretamente |

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Backend — Domain + Infra (Arrecadação)**
   - Migration `ativo`, atualizar `Rubrica` entity, expandir `RubricaRepository`
   - Implementar `SiglaSuggester` (domain service puro)

2. **Backend — Application (Arrecadação)**
   - Commands, Handlers, DTOs
   - Tests unitários

3. **Backend — API (Arrecadação)**
   - Expandir `RubricaController` com novos endpoints
   - Atualizar `permissions.yaml`
   - Ajustar `Licenca.criar()` e `RegistrarPagamentoCommandHandler`

4. **Backend — Distribuição**
   - Migration `ativo` no schema distribuicao
   - Atualizar `Rubrica`, `RubricaEventPayload`, `RubricaEventHandler`

5. **Frontend**
   - API client, hooks, components, pages
   - Rotas, sidebar, permissões

6. **Integração e Testes E2E**
   - Testes de integração (Testcontainers)
   - Validação de eventos entre Arrecadação e Distribuição

### Dependências Técnicas

| # | Dependência | Bloqueia |
|---|---|---|
| 1 | Migration `ativo` em Arrecadação | Tudo relacionado a Rubrica |
| 2 | `RubricaRepository.save()` | Commands de criação/atualização |
| 3 | Backend completo (passo 3) | Frontend (precisa da API) |
| 4 | `RubricaEventPayload` com `ativo` | Sincronização Distribuição |

---

## Monitoramento e Observabilidade

- **Métricas:** Counter `arrecadacao.rubrica.criada`, `arrecadacao.rubrica.inativada` (via Micrometer)
- **Logs:** `INFO` em criação, inativação, reativação com sigla e autor
- **Eventos:** Outbox Pattern garante at-least-once; monitorar lag na tabela `outbox_events`

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---|---|
| **Flag `ativo` em vez de status enum** | Simplifica modelo (boolean vs enum). Alinhado com decisão de não ter máquina de estados complexa para rubrica. |
| **Evento único `rubrica.atualizada`** | Reaproveita binding existente na Distribuição. Evita criar novo routing-key. Payload inclui `ativo` para sincronização completa. |
| **Sigla imutável após criação** | Sigla é chave natural usada em eventos e snapshots. Mutabilidade criaria inconsistência entre domínios. |
| **Sigla sugerida, não imposta** | Usuário pode aceitar ou informar manualmente, resolvendo colisões de forma elegante. |
| **Inativação simples (sem movimentação)** | Reduz drasticamente escopo e risco. Pagamentos existentes ficam. |

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Siglas geradas automaticamente podem colidir com seed existentes | Algoritmo + validação de unicidade + usuário informa manual se colidir |
| Licenças existentes de rubrica inativa continuam ATIVAS | Comportamento esperado e documentado. Não reativam automaticamente. |
| Eventos de rubrica podem não ser consumidos pela Distribuição | Outbox Pattern + DLQ (padrão existente no projeto) |

### Conformidade com Padrões

- **Arquitetura:** Clean Architecture com camadas numeradas (1-Services, 2-Application, 3-Domain, 4-Infra) — padrão Java do projeto
- **CQRS:** Commands e Queries separados, dispatcher nativo (sem MediatR)
- **Eventos:** Outbox Pattern + CloudEvents — padrão existente
- **Auth:** `@RequiresPermission` com permissões `dominio:area:recurso:acao` — padrão do authz-spring-boot-starter
- **API:** REST, camelCase, RFC 7807 ProblemDetails
- **Testes:** JUnit 5 + AssertJ + Testcontainers — padrão existente
