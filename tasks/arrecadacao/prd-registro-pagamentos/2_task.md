---
status: pending
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

# Tarefa 2.0: Domain Layer — enum, entidades, exceptions e interfaces

## Relacionada as User Stories

- [HU-01] Ajustar valor UDA (cobertura direta — UdaValor entity)
- [HU-03] Registrar pagamento (cobertura direta — Pagamento entity)
- [HU-06] Consultar UDA vigente (cobertura direta — repository interface)

## Visao Geral

Implementar a camada de dominio para F04: enum `StatusPagamento`, entidades `UdaValor` (append-only com factory `criar()`) e `Pagamento` (factory `registrar()` com calculo BigDecimal e domain method `estornar()` preparado para F06), exceptions de dominio (`PagamentoDuplicadoException`, `UdaVigenteNaoEncontradaException`), e interfaces de repositorio. Inclui testes unitarios para validar guards e calculo de valorBruto.

## Requisitos

- `StatusPagamento`: CONFIRMADO, ESTORNADO
- `UdaValor`: imutavel, factory `criar()` com validacao valor > 0 e dataVigencia not null
- `Pagamento`: factory `registrar()` calcula valorBruto = quantidadeUdas × valorUdaVigente, periodo auto (YearMonth.now()), status CONFIRMADO; `estornar()` valida status CONFIRMADO
- `PagamentoDuplicadoException`: extends DomainException (para HTTP 409)
- `UdaVigenteNaoEncontradaException`: extends DomainException (para HTTP 422)
- Interfaces: `UdaValorRepository` (save, findVigente, findAllOrderByDataVigenciaDesc), `PagamentoRepository` (save, findById, findAll(Spec,Pageable), existsConfirmadoByLicencaIdAndPeriodo)

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/enums/StatusPagamento.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UdaValor.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Pagamento.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/PagamentoDuplicadoException.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/UdaVigenteNaoEncontradaException.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/UdaValorRepository.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/PagamentoRepository.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/UdaValorTest.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/PagamentoTest.java`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Licenca.java` (referencia para @ManyToOne no Pagamento)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/DomainException.java` (classe base)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/LicencaRepository.java` (padrao de interface)
- **Skills para consultar durante implementacao:**
  - `java-architecture` — domain layer sem dependencia de framework
  - `java-code-quality` — factory methods, guard clauses, BigDecimal handling
  - `java-testing` — JUnit 5 + AssertJ, naming convention

## Subtarefas

- [ ] 2.1 Criar enum `StatusPagamento` (CONFIRMADO, ESTORNADO)
- [ ] 2.2 Criar entidade `UdaValor` com JPA annotations, factory `criar()` e getters
- [ ] 2.3 Criar entidade `Pagamento` com factory `registrar()`, domain method `estornar()`, @ManyToOne para Licenca (read-only)
- [ ] 2.4 Criar `PagamentoDuplicadoException` e `UdaVigenteNaoEncontradaException`
- [ ] 2.5 Criar interfaces `UdaValorRepository` e `PagamentoRepository`
- [ ] 2.6 Criar `UdaValorTest` — criar() valido, valor <= 0 throws, null checks
- [ ] 2.7 Criar `PagamentoTest` — registrar() valido (verifica calculo valorBruto), quantidadeUdas <= 0 throws, periodo auto-preenchido, snapshot imutavel, estornar() de CONFIRMADO, estornar() de ESTORNADO throws

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-06, RF-07, RF-09, RF-10, RF-11, RN-P01 a RN-P09
- Evidencia esperada: testes unitarios passam; build compila

## Detalhes de Implementacao

**UdaValor entity:**

```java
@Entity
@Table(name = "uda_valor", schema = "arrecadacao")
public class UdaValor {
    @Id
    private UUID id;

    @Column(name = "valor", precision = 18, scale = 6, nullable = false)
    private BigDecimal valor;

    @Column(name = "data_vigencia", nullable = false)
    private LocalDate dataVigencia;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "criado_por", length = 200)
    private String criadoPor;  // nullable for seed

    protected UdaValor() {}

    public static UdaValor criar(BigDecimal valor, LocalDate dataVigencia, String criadoPor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor must be greater than zero");
        }
        if (dataVigencia == null) {
            throw new IllegalArgumentException("DataVigencia must not be null");
        }
        UdaValor uda = new UdaValor();
        uda.id = UUID.randomUUID();
        uda.valor = valor;
        uda.dataVigencia = dataVigencia;
        uda.criadoPor = criadoPor;
        uda.criadoEm = Instant.now();
        return uda;
    }
    // Getters only
}
```

**Pagamento entity:**

```java
@Entity
@Table(name = "pagamento", schema = "arrecadacao")
public class Pagamento {
    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Column(name = "quantidade_udas", precision = 18, scale = 6, nullable = false)
    private BigDecimal quantidadeUdas;

    @Column(name = "valor_uda_no_momento", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorUdaNoMomento;

    @Column(name = "valor_bruto", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorBruto;

    @Column(name = "periodo", length = 7, nullable = false)
    private String periodo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private StatusPagamento status;

    @Column(name = "data_registro", nullable = false)
    private Instant dataRegistro;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licenca_id", insertable = false, updatable = false)
    private Licenca licenca;

    protected Pagamento() {}

    public static Pagamento registrar(UUID licencaId, BigDecimal quantidadeUdas,
                                       BigDecimal valorUdaVigente) {
        if (quantidadeUdas == null || quantidadeUdas.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("QuantidadeUdas must be greater than zero");
        }
        Pagamento p = new Pagamento();
        p.id = UUID.randomUUID();
        p.licencaId = licencaId;
        p.quantidadeUdas = quantidadeUdas;
        p.valorUdaNoMomento = valorUdaVigente;
        p.valorBruto = quantidadeUdas.multiply(valorUdaVigente);
        p.periodo = YearMonth.now().toString();
        p.status = StatusPagamento.CONFIRMADO;
        Instant now = Instant.now();
        p.dataRegistro = now;
        p.criadoEm = now;
        p.atualizadoEm = now;
        return p;
    }

    public void estornar() {
        if (this.status != StatusPagamento.CONFIRMADO) {
            throw new IllegalStateException("Only CONFIRMADO payments can be reversed");
        }
        this.status = StatusPagamento.ESTORNADO;
        this.atualizadoEm = Instant.now();
    }
    // Getters only
}
```

**Convencoes da stack:**
- Domain layer sem dependencias de framework (exceto JPA annotations para mapeamento)
- Factory methods estaticos para criacao
- Guard clauses no inicio dos metodos
- BigDecimal para valores monetarios, nunca float/double
- Testes seguem padrao AAA e naming `methodName_Condition_ExpectedBehavior`

## Criterios de Sucesso (Verificaveis)

- [ ] Testes unitarios passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-domain`
- [ ] `UdaValorTest` — criar() valido, valor <= 0 throws, dataVigencia null throws
- [ ] `PagamentoTest` — registrar() calcula valorBruto corretamente (ex: 5.5 × 107.31 = 590.205)
- [ ] `PagamentoTest` — periodo auto-preenchido com YearMonth.now()
- [ ] `PagamentoTest` — estornar() de ESTORNADO throws IllegalStateException
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-domain`
