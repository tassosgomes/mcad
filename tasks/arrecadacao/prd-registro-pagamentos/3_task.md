---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Infrastructure — repositorios JPA e Spring Data

## Relacionada as User Stories

- [HU-01] Ajustar valor UDA (cobertura direta — persistencia UdaValor)
- [HU-03] Registrar pagamento (cobertura direta — persistencia Pagamento)
- [HU-06] Consultar UDA vigente (cobertura direta — findVigente)

## Visao Geral

Implementar os adapters de repositorio na camada infra: `SpringDataUdaValorRepository` (Spring Data JPA), `JpaUdaValorRepository` (adapter que implementa a interface de dominio), `SpringDataPagamentoRepository` (Spring Data + JpaSpecificationExecutor) e `JpaPagamentoRepository` (adapter). O `findVigente` usa query JPQL para buscar UDA com maior dataVigencia <= parametro.

## Requisitos

- `SpringDataUdaValorRepository`: extends JpaRepository, query customizada findVigente (JPQL: ORDER BY dataVigencia DESC LIMIT 1 WHERE dataVigencia <= :data)
- `JpaUdaValorRepository`: implementa UdaValorRepository (domain interface), delega para SpringData
- `SpringDataPagamentoRepository`: extends JpaRepository + JpaSpecificationExecutor, metodo existsConfirmado via @Query
- `JpaPagamentoRepository`: implementa PagamentoRepository (domain interface), delega para SpringData

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataUdaValorRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaUdaValorRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataPagamentoRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaPagamentoRepository.java`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/UdaValorRepository.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/PagamentoRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaLicencaRepository.java` (padrao de adapter)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataLicencaRepository.java` (padrao Spring Data)
- **Skills para consultar durante implementacao:**
  - `java-architecture` — Repository Pattern (Port & Adapter)
  - `java-code-quality` — constructor injection, final fields

## Subtarefas

- [ ] 3.1 Criar `SpringDataUdaValorRepository` com @Query findTopByDataVigenciaLessThanEqualOrderByDataVigenciaDesc
- [ ] 3.2 Criar `JpaUdaValorRepository` implementando UdaValorRepository (save, findVigente, findAllOrderByDataVigenciaDesc)
- [ ] 3.3 Criar `SpringDataPagamentoRepository` com JpaSpecificationExecutor e @Query existsConfirmado
- [ ] 3.4 Criar `JpaPagamentoRepository` implementando PagamentoRepository

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-02 (findVigente), RF-12 (existsConfirmado)
- Evidencia esperada: build compila; repositorios injetaveis pelo Spring

## Detalhes de Implementacao

**SpringDataUdaValorRepository:**

```java
public interface SpringDataUdaValorRepository extends JpaRepository<UdaValor, UUID> {

    @Query("SELECT u FROM UdaValor u WHERE u.dataVigencia <= :data ORDER BY u.dataVigencia DESC LIMIT 1")
    Optional<UdaValor> findTopByDataVigenciaLessThanEqualOrderByDataVigenciaDesc(@Param("data") LocalDate data);

    List<UdaValor> findAllByOrderByDataVigenciaDesc();
}
```

**JpaUdaValorRepository:**

```java
@Repository
public class JpaUdaValorRepository implements UdaValorRepository {
    private final SpringDataUdaValorRepository springData;

    public JpaUdaValorRepository(SpringDataUdaValorRepository springData) {
        this.springData = springData;
    }

    @Override
    public UdaValor save(UdaValor entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<UdaValor> findVigente(LocalDate data) {
        return springData.findTopByDataVigenciaLessThanEqualOrderByDataVigenciaDesc(data);
    }

    @Override
    public List<UdaValor> findAllOrderByDataVigenciaDesc() {
        return springData.findAllByOrderByDataVigenciaDesc();
    }
}
```

**SpringDataPagamentoRepository:**

```java
public interface SpringDataPagamentoRepository extends JpaRepository<Pagamento, UUID>,
        JpaSpecificationExecutor<Pagamento> {

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Pagamento p " +
           "WHERE p.licencaId = :licencaId AND p.periodo = :periodo AND p.status = 'CONFIRMADO'")
    boolean existsConfirmadoByLicencaIdAndPeriodo(@Param("licencaId") UUID licencaId,
                                                   @Param("periodo") String periodo);
}
```

**JpaPagamentoRepository:**

```java
@Repository
public class JpaPagamentoRepository implements PagamentoRepository {
    private final SpringDataPagamentoRepository springData;

    public JpaPagamentoRepository(SpringDataPagamentoRepository springData) {
        this.springData = springData;
    }

    @Override
    public Pagamento save(Pagamento entity) { return springData.save(entity); }

    @Override
    public Optional<Pagamento> findById(UUID id) { return springData.findById(id); }

    @Override
    public Page<Pagamento> findAll(Specification<Pagamento> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }

    @Override
    public boolean existsConfirmadoByLicencaIdAndPeriodo(UUID licencaId, String periodo) {
        return springData.existsConfirmadoByLicencaIdAndPeriodo(licencaId, periodo);
    }
}
```

**Convencoes da stack:**
- Constructor injection com campos final
- @Repository no adapter (nao na interface Spring Data)
- Entidades de dominio usadas diretamente (sem MapStruct neste projeto — entidades JPA sao as proprias entidades de dominio conforme F02/F03)

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [ ] Spring Data resolve as queries JPQL sem erros de sintaxe
- [ ] Testes existentes continuam passando: `cd services/arrecadacao-api && mvn test`
