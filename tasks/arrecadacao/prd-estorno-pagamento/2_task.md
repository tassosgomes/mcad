---
status: done
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain — atualizar Pagamento.estornar() + VerbaService interface + exception + testes

## Relacionada as User Stories

- [HU-01] Estornar pagamento (cobertura direta — domain method)
- [HU-02] Consultar pagamento estornado (cobertura direta — campos de estorno)

## Visao Geral

Estender a entidade Pagamento com 3 novos campos JPA (justificativaEstorno, estornadoPor, estornadoEm) e atualizar a assinatura de `estornar()` para receber justificativa e autor, preenchendo todos os campos atomicamente. Criar a interface `VerbaService` como contrato para F05 e a exception `VerbaEmDistribuicaoException`. Atualizar testes unitarios existentes e adicionar novos cenarios.

## Requisitos

1. Adicionar 3 campos JPA a Pagamento: justificativaEstorno, estornadoPor, estornadoEm
2. Atualizar `estornar()` para `estornar(String justificativa, String autor)`
3. Guards: status CONFIRMADO, justificativa 10-500 chars, autor not blank
4. Criar VerbaService interface com 2 metodos (contrato para F05)
5. Criar VerbaEmDistribuicaoException extends RuntimeException
6. Atualizar testes unitarios existentes + adicionar novos

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/VerbaService.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/VerbaEmDistribuicaoException.java`
- **Modificar:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Pagamento.java` (3 campos + assinatura estornar)
  - `services/arrecadacao-api/arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/PagamentoTest.java` (atualizar testes existentes + novos cenarios)
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/EntidadeNaoEncontradaException.java` (padrao exception)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/enums/StatusPagamento.java`

## Subtarefas

- [x] 2.1 Adicionar 3 campos JPA + getters a Pagamento
- [x] 2.2 Atualizar `estornar()` com nova assinatura e guards
- [x] 2.3 Criar `VerbaService` interface (validarLockParaEstorno, recalcularVerba)
- [x] 2.4 Criar `VerbaEmDistribuicaoException`
- [x] 2.5 Atualizar PagamentoTest (testes existentes usam estornar() sem args — atualizar)
- [x] 2.6 Adicionar testes: justificativa curta/longa throws, autor null throws, campos preenchidos corretamente

## Detalhes de Implementacao

**Pagamento.java — novos campos:**

```java
@Column(name = "justificativa_estorno", length = 500)
private String justificativaEstorno;

@Column(name = "estornado_por", length = 200)
private String estornadoPor;

@Column(name = "estornado_em")
private Instant estornadoEm;
```

**Pagamento.estornar() — assinatura atualizada:**

```java
public void estornar(String justificativa, String autor) {
    if (this.status != StatusPagamento.CONFIRMADO) {
        throw new IllegalStateException(
            "Apenas pagamentos CONFIRMADOS podem ser estornados. Status atual: " + this.status);
    }
    if (justificativa == null || justificativa.length() < 10 || justificativa.length() > 500) {
        throw new IllegalArgumentException(
            "Justificativa must be between 10 and 500 characters");
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
```

**VerbaService interface:**

```java
public interface VerbaService {
    void validarLockParaEstorno(UUID licencaId, String periodo);
    void recalcularVerba(String rubricaSigla, String periodo);
}
```

**VerbaEmDistribuicaoException:**

```java
public class VerbaEmDistribuicaoException extends RuntimeException {
    public VerbaEmDistribuicaoException(String message) {
        super(message);
    }
}
```

## Testes

- [ ] `estornar_WithConfirmado_ShouldSetEstornadoAndFillAllFields` — verifica status, justificativa, autor, estornadoEm, atualizadoEm
- [ ] `estornar_WithEstornado_ShouldThrowIllegalState` — atualizar teste existente para nova assinatura
- [ ] `estornar_WithShortJustificativa_ShouldThrowIllegalArgument` — < 10 chars
- [ ] `estornar_WithLongJustificativa_ShouldThrowIllegalArgument` — > 500 chars
- [ ] `estornar_WithNullJustificativa_ShouldThrowIllegalArgument`
- [ ] `estornar_WithBlankAutor_ShouldThrowIllegalArgument`

## Criterios de Sucesso

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-domain`
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-domain`
- [ ] Testes existentes atualizados sem quebra
