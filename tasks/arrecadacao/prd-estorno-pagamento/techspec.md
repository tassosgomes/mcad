# Tech Spec — F06: Estorno de Pagamento (Backend + Frontend)

> **PRD:** `tasks/arrecadacao/prd-estorno-pagamento/prd.md`
> **Data:** 2026-04-06

---

## Resumo Executivo

Sexta e última feature do serviço `arrecadacao-api`. Adiciona o endpoint `POST /pagamentos/{id}/estornar` que reverte um pagamento CONFIRMADO para ESTORNADO com justificativa obrigatória. Atualiza a assinatura de `Pagamento.estornar()` (já preparado no F04) para receber justificativa e autor. Valida lock de verba via interface `VerbaService` (implementada pelo F05) antes de permitir o estorno, e recalcula a verba líquida do período. Publica evento `arrecadacao.pagamento.estornado` via Outbox Pattern.

No frontend, ativa o botão "Estornar" na PagamentoDetailPage (preparado no F04 como disabled), adiciona modal de confirmação com justificativa e card de dados do estorno para pagamentos ESTORNADOS.

Reutiliza toda a infraestrutura CQRS, Repository Pattern, Exception Handling e Outbox Pattern estabelecida em F01-F04.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | CQRS Command/Handler, domain method, Outbox Pattern |
| `java-code-quality` | Guard clauses, records, Bean Validation |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers |
| `java-observability` | Logging SLF4J no endpoint de estorno |
| `react-architecture` | Feature modules, hooks, modal pattern |
| `react-code-quality` | TypeScript strict, CSS Modules |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
API Layer (arrecadacao-api)
  └─ PagamentoController (extensão)
       └─ POST /pagamentos/{id}/estornar → CommandDispatcher → EstornarPagamentoCommand

Application Layer (arrecadacao-application)
  └─ EstornarPagamentoCommand + Handler
       ├─ PagamentoRepository.findById()
       ├─ Pagamento.estornar(justificativa, autor)
       ├─ VerbaService.validarLockParaEstorno(licencaId, periodo)
       ├─ PagamentoRepository.save()
       ├─ VerbaService.recalcularVerba(rubricaSigla, periodo)
       └─ OutboxEventWriter.addEvent("arrecadacao.pagamento.estornado")

Domain Layer (arrecadacao-domain — extensão)
  └─ Pagamento: 3 novos campos + estornar(justificativa, autor)
  └─ VerbaEmDistribuicaoException (nova)
  └─ VerbaService (interface — implementação em F05)

Infrastructure Layer (arrecadacao-infra)
  └─ Migration V9: ALTER TABLE pagamento ADD 3 columns

Frontend (extensão do módulo pagamentos F04)
  └─ useEstornarPagamento hook
  └─ EstornarPagamentoModal component
  └─ PagamentoDetailPage extensão (card estorno + botão ativo)
```

### Dependência F05

O handler usa `VerbaService` (interface no domain) para:
1. `validarLockParaEstorno(licencaId, periodo)` — verifica se verba está ABERTA
2. `recalcularVerba(rubricaSigla, periodo)` — recalcula após estorno

F05 implementa essa interface. Se F05 não estiver implementado, testes usam mock. A interface é definida nesta techspec como contrato.

---

## Design de Implementação

### Domain Layer (Extensão)

#### Pagamento — 3 novos campos + assinatura atualizada

```java
// Novos campos na entidade Pagamento
@Column(name = "justificativa_estorno", length = 500)
private String justificativaEstorno;

@Column(name = "estornado_por", length = 200)
private String estornadoPor;

@Column(name = "estornado_em")
private Instant estornadoEm;

// Assinatura atualizada (substituir método existente)
public void estornar(String justificativa, String autor) {
    if (this.status != StatusPagamento.CONFIRMADO) {
        throw new IllegalStateException("Only CONFIRMADO payments can be reversed");
    }
    if (justificativa == null || justificativa.length() < 10 || justificativa.length() > 500) {
        throw new IllegalArgumentException("Justificativa must be between 10 and 500 characters");
    }
    if (autor == null || autor.isBlank()) {
        throw new IllegalArgumentException("Autor must not be blank");
    }
    this.status = StatusPagamento.ESTORNADO;
    this.justificativaEstorno = justificativa;
    this.estornadoPor = autor;
    this.estornadoEm = Instant.now();
    this.atualizadoEm = Instant.now();
}

// Getters para os novos campos
public String getJustificativaEstorno() { return justificativaEstorno; }
public String getEstornadoPor() { return estornadoPor; }
public Instant getEstornadoEm() { return estornadoEm; }
```

#### VerbaService (Interface — contrato para F05)

```java
public interface VerbaService {
    /**
     * Valida se a verba do período permite alterações (status ABERTA).
     * Lança VerbaEmDistribuicaoException se EM_DISTRIBUICAO ou DISTRIBUIDA.
     */
    void validarLockParaEstorno(UUID licencaId, String periodo);

    /**
     * Recalcula verba líquida somando apenas pagamentos CONFIRMADOS.
     * Publica evento arrecadacao.verba.disponivel com valor atualizado.
     */
    void recalcularVerba(String rubricaSigla, String periodo);
}
```

#### VerbaEmDistribuicaoException

```java
public class VerbaEmDistribuicaoException extends DomainException {
    public VerbaEmDistribuicaoException(String message) {
        super(message);
    }
}
```

**Nota:** Para obter `rubricaSigla` a partir do pagamento, o handler acessa `pagamento.getLicenca().getRubrica().getSigla()` via join @ManyToOne (read-only, já configurado no F04).

### Application Layer

#### Command

```java
public record EstornarPagamentoCommand(
    UUID pagamentoId, String justificativa, String autor
) implements Command<PagamentoResponse> {}
```

#### Request DTO

```java
public record EstornarPagamentoRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
```

#### Command Handler

```java
@Service
@Transactional
public class EstornarPagamentoCommandHandler
        implements CommandHandler<EstornarPagamentoCommand, PagamentoResponse> {

    private static final Logger LOGGER = LoggerFactory.getLogger(
        EstornarPagamentoCommandHandler.class);

    private final PagamentoRepository pagamentoRepository;
    private final VerbaService verbaService;
    private final OutboxEventWriter outboxEventWriter;

    // constructor injection

    @Override
    public PagamentoResponse handle(EstornarPagamentoCommand cmd) {
        // 1. Buscar pagamento
        Pagamento pagamento = pagamentoRepository.findById(cmd.pagamentoId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException("Pagamento not found"));

        // 2. Validar lock de verba (F05)
        verbaService.validarLockParaEstorno(
            pagamento.getLicencaId(), pagamento.getPeriodo());

        // 3. Estornar (domain method — valida status + preenche campos)
        pagamento.estornar(cmd.justificativa(), cmd.autor());

        // 4. Salvar
        pagamento = pagamentoRepository.save(pagamento);

        // 5. Recalcular verba (F05)
        String rubricaSigla = pagamento.getLicenca().getRubrica().getSigla();
        verbaService.recalcularVerba(rubricaSigla, pagamento.getPeriodo());

        // 6. Publicar evento Outbox
        outboxEventWriter.addEvent(
            "arrecadacao.pagamento.estornado",
            pagamento.getId().toString(),
            buildEventPayload(pagamento, rubricaSigla));

        LOGGER.info("Payment {} reversed by {}", cmd.pagamentoId(), cmd.autor());

        // 7. Mapear response
        return mapToResponse(pagamento);
    }
}
```

#### PagamentoResponse (extensão)

Adicionar 3 campos nullable ao record existente:

```java
public record PagamentoResponse(
    UUID id, LicencaResumoResponse licenca,
    String quantidadeUdas, String valorUdaNoMomento, String valorBruto,
    String periodo, String status,
    Instant dataRegistro, Instant criadoEm, Instant atualizadoEm,
    // F06 — campos de estorno (nullable quando CONFIRMADO)
    String justificativaEstorno, String estornadoPor, Instant estornadoEm
) {}
```

### Modelos de Dados (Flyway Migration)

#### V9__add_estorno_columns_pagamento.sql

```sql
ALTER TABLE arrecadacao.pagamento
    ADD COLUMN justificativa_estorno VARCHAR(500),
    ADD COLUMN estornado_por VARCHAR(200),
    ADD COLUMN estornado_em TIMESTAMPTZ;
```

### API Layer

#### PagamentoController (extensão — novo endpoint)

```java
@PostMapping("/{id}/estornar")
@PreAuthorize("hasRole('analista-arrecadacao')")
public ResponseEntity<PagamentoResponse> estornar(
        @PathVariable UUID id,
        @Valid @RequestBody EstornarPagamentoRequest request,
        Authentication auth) {
    LOGGER.info("Reversing payment: id={}, user={}", id, auth.getName());
    var cmd = new EstornarPagamentoCommand(id, request.justificativa(), auth.getName());
    return ResponseEntity.ok(dispatcher.dispatch(cmd));
}
```

#### GlobalExceptionHandler (extensão)

```java
@ExceptionHandler(VerbaEmDistribuicaoException.class)
public ResponseEntity<ProblemDetail> handleVerbaEmDistribuicao(
        VerbaEmDistribuicaoException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    problem.setTitle("Verba In Distribution");
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
}
```

### Endpoints de API

| Método | Path | Auth | operationId |
|--------|------|------|-------------|
| `POST` | `/api/v1/pagamentos/{id}/estornar` | JWT (Analista) | `estornarPagamento` |

### Frontend

#### Types (extensão pagamento.ts)

```typescript
// Adicionar ao Pagamento existente
export interface Pagamento {
  // ... campos existentes F04
  justificativaEstorno: string | null;
  estornadoPor: string | null;
  estornadoEm: string | null;
}

export interface EstornarPagamentoRequest {
  justificativa: string;
}
```

#### API function (extensão pagamentosApi.ts)

```typescript
export async function estornarPagamento(
  id: string, data: EstornarPagamentoRequest
): Promise<Pagamento> {
  return apiPostArr<Pagamento>(`/pagamentos/${id}/estornar`, data);
}
```

#### Hook useEstornarPagamento

```typescript
export function useEstornarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstornarPagamentoRequest }) =>
      estornarPagamento(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos', id] });
    },
  });
}
```

#### EstornarPagamentoModal

```typescript
interface EstornarPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagamento: Pagamento;
}

// Modal com:
// - Resumo do pagamento (licenca, periodo, valorBruto formatado)
// - Textarea justificativa (min 10, max 500, contador de chars)
// - Botão "Confirmar Estorno" (variant: destructive/vermelho)
// - Tratamento de erros: 422 → toast contextual
```

#### PagamentoDetailPage (extensão)

```typescript
// Quando ESTORNADO: renderizar card "Dados do Estorno"
{pagamento.status === 'ESTORNADO' && (
  <Card title="Dados do Estorno">
    <Field label="Justificativa">{pagamento.justificativaEstorno}</Field>
    <Field label="Estornado por">{pagamento.estornadoPor}</Field>
    <Field label="Data do estorno">{formatDateTime(pagamento.estornadoEm)}</Field>
  </Card>
)}

// Quando CONFIRMADO + analista: ativar botão (era disabled no F04)
{pagamento.status === 'CONFIRMADO' && isAnalista && (
  <Button variant="destructive" onClick={() => setShowModal(true)}>
    Estornar
  </Button>
)}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `arrecadacao-infra/.../resources/db/migration/V9__add_estorno_columns_pagamento.sql` | Migration | ALTER TABLE + 3 columns |
| `arrecadacao-domain/.../domain/exceptions/VerbaEmDistribuicaoException.java` | Exception | 422 verba lock |
| `arrecadacao-domain/.../domain/interfaces/VerbaService.java` | Interface | Contrato para F05 |
| `arrecadacao-application/.../application/commands/EstornarPagamentoCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/handlers/EstornarPagamentoCommandHandler.java` | Handler | Orquestra estorno |
| `arrecadacao-application/.../application/dto/EstornarPagamentoRequest.java` | DTO | Bean Validation |
| `arrecadacao-domain/src/test/.../domain/entities/PagamentoEstornoTest.java` | Teste | Unitário domain |
| `arrecadacao-application/src/test/.../commands/handlers/EstornarPagamentoCommandHandlerTest.java` | Teste | Unitário handler |
| `frontend/src/features/arrecadacao/pagamentos/hooks/useEstornarPagamento.ts` | Hook | useMutation |
| `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.tsx` | Component | Modal confirmação |
| `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.module.css` | Style | CSS Module |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `arrecadacao-domain/.../domain/entities/Pagamento.java` | Adicionar 3 campos + atualizar assinatura estornar() |
| `arrecadacao-application/.../application/dto/PagamentoResponse.java` | Adicionar 3 campos nullable |
| `arrecadacao-api/.../api/controllers/PagamentoController.java` | Adicionar endpoint POST /{id}/estornar |
| `arrecadacao-api/.../api/config/GlobalExceptionHandler.java` | Adicionar handler VerbaEmDistribuicaoException → 422 |
| `arrecadacao-tests/.../api/PagamentoEndpointsIntegrationTest.java` | Adicionar cenários de estorno |
| `arrecadacao-tests/.../infra/persistence/PagamentoPersistenceIntegrationTest.java` | Adicionar cenário persistência estorno |
| `frontend/src/features/arrecadacao/pagamentos/types/pagamento.ts` | Adicionar 3 campos + EstornarPagamentoRequest |
| `frontend/src/features/arrecadacao/pagamentos/api/pagamentosApi.ts` | Adicionar função estornarPagamento |
| `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx` | Ativar botão + card dados estorno |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `arrecadacao-domain/.../domain/entities/OutboxEvent.java` | Padrão Outbox |
| `arrecadacao-domain/.../domain/interfaces/OutboxEventWriter.java` | Interface evento |
| `arrecadacao-application/.../application/cqrs/*.java` | CQRS foundation |
| `arrecadacao-domain/.../domain/entities/Licenca.java` | Join para rubricaSigla |

---

## Análise de Impacto

| Componente | Tipo | Descrição & Risco | Ação |
|------------|------|-------------------|------|
| Pagamento entity | Extensão | 3 novos campos + assinatura atualizada. Baixo risco — aditivo | Modificar |
| PagamentoResponse | Extensão | 3 novos campos nullable. Backward compatible | Modificar |
| PagamentoController | Extensão | 1 novo endpoint. Sem impacto em endpoints existentes | Estender |
| GlobalExceptionHandler | Extensão | 1 novo handler. Sem impacto em handlers existentes | Estender |
| F05 (Verba) — dependência | Interface | VerbaService interface. F05 deve implementar | Definir contrato |
| Partial unique index | Reutilização | Estorno libera slot automaticamente (WHERE status = 'CONFIRMADO') | Sem modificação |

---

## Abordagem de Testes

### Testes Unitários

**Domain:**
- `PagamentoEstornoTest` — `estornar_WithConfirmado_ShouldSetEstornadoAndFillFields`, `estornar_WithEstornado_ShouldThrow`, `estornar_WithShortJustificativa_ShouldThrow`, `estornar_WithLongJustificativa_ShouldThrow`, `estornar_WithNullAutor_ShouldThrow`

**Application (mock repositories + VerbaService):**
- `EstornarPagamentoCommandHandlerTest` — happy path (verifica estorno + recalculo + evento Outbox), pagamento não encontrado (404), pagamento já estornado (422), verba em distribuição (422)

### Testes de Integração

**PagamentoPersistenceIntegrationTest (extensão):**
- Persistência dos 3 novos campos após estorno
- Partial unique: após estorno, novo CONFIRMADO para mesma licença+período permitido

**PagamentoEndpointsIntegrationTest (extensão):**
- POST /pagamentos/{id}/estornar (200): estorna e retorna campos preenchidos
- POST /pagamentos/{id}/estornar (400): justificativa < 10 chars
- POST /pagamentos/{id}/estornar (404): pagamento inexistente
- POST /pagamentos/{id}/estornar (422): pagamento já ESTORNADO
- POST /pagamentos/{id}/estornar (422): verba em distribuição (mock VerbaService)
- POST /pagamentos/{id}/estornar (403): consultor

---

## Sequenciamento de Desenvolvimento

1. **Migration V9** — ALTER TABLE pagamento + 3 columns
2. **Domain** — Atualizar Pagamento (campos + estornar()), VerbaEmDistribuicaoException, VerbaService interface + testes unitários
3. **Application** — EstornarPagamentoCommand + Handler + DTO + testes unitários
4. **API** — Endpoint no PagamentoController + GlobalExceptionHandler
5. **Testes de integração** — Persistência + endpoints estorno
6. **Frontend** — Types + API + hook + modal + extensão detail page

### Dependências Técnicas

- F04 implementado (Pagamento entity, PagamentoController, PagamentoRepository existem)
- F05 parcialmente necessário (VerbaService interface definida aqui; implementação em F05)
- CQRS foundation e Outbox Pattern do F01/F02
- GlobalExceptionHandler com handlers base

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| `estornar(justificativa, autor)` no domain | Mantém lógica de negócio no domínio; campos preenchidos atomicamente |
| VerbaService como interface | Desacopla F06 de F05; testável com mock |
| Migration V9 (ALTER TABLE) | Mais simples que nova tabela; 3 campos nullable são aditivos |
| Reutilizar PagamentoResponse | Campos nullable quando CONFIRMADO; evita DTO separado para estorno |
| Evento na mesma transação | Garantia at-least-once: evento só existe se estorno persistiu |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| F05 não implementado quando F06 rodar | Mock da VerbaService nos testes; handler testável isoladamente |
| Race condition: dois estornos simultâneos | Domain guard (status check) + save otimista resolve |
| Recálculo de verba incorreto | Lógica centralizada no VerbaService (F05); F06 apenas chama interface |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
