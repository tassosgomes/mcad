---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 2.0: Verba Persistence (Jpa + Spring Data + lock pessimista)

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (suporte — habilita persistencia)
- [HU-02] Recalculo automatico ao estornar pagamento (suporte)

## Visao Geral

Implementar a camada de infra de `Verba`: `SpringDataVerbaRepository` (CRUD JPA padrao) e `JpaVerbaRepository` (adapter que implementa `VerbaRepository` do dominio). Garantir `SELECT FOR UPDATE` na busca usada durante recalculo para serializar pagamentos concorrentes na mesma `(rubrica, periodo)`. Espelhar a estrutura ja usada por `JpaLicencaRepository` e `JpaPagamentoRepository`.

## Requisitos

- `SpringDataVerbaRepository extends JpaRepository<Verba, UUID>, JpaSpecificationExecutor<Verba>`
- Metodo `findByRubricaIdAndPeriodoForUpdate(...)` anotado com `@Lock(LockModeType.PESSIMISTIC_WRITE)`
- Metodo `findByRubricaIdAndPeriodo(...)` sem lock para consultas read-only
- `JpaVerbaRepository` implementando `VerbaRepository` no estilo Repository Pattern existente
- Suporte a `Page<Verba> findAll(Specification<Verba>, Pageable)` para o controller (task 7.0)
- Query nativa ou JPQL para `findAgregadoPorRubrica` retornando projecao com SUM(bruto), SUM(liquida), COUNT(periodo)

## Subtarefas

- [ ] 2.1 Criar `SpringDataVerbaRepository` em `arrecadacao-infra/...persistence/`
- [ ] 2.2 Criar `JpaVerbaRepository` (adapter) e registrar como `@Component`
- [ ] 2.3 Criar `VerbaAgregadoProjection` (record) + query JPQL/nativa
- [ ] 2.4 Teste de integracao `VerbaPersistenceIT` (Testcontainers): unique constraint, lock FOR UPDATE entre threads, projecao agregada

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 5.0
- Paralelizavel: Sim (independente de 3.0 e 4.0)

## Rastreabilidade

- Esta tarefa cobre: HU-01 (suporte), HU-02 (suporte)
- Evidencia esperada: testes de integracao verdes, `JpaVerbaRepository` registrado no contexto Spring

## Detalhes de Implementacao

```java
public interface SpringDataVerbaRepository
        extends JpaRepository<Verba, UUID>, JpaSpecificationExecutor<Verba> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT v FROM Verba v WHERE v.rubricaId = :rubricaId AND v.periodo = :periodo")
    Optional<Verba> findByRubricaIdAndPeriodoForUpdate(
            @Param("rubricaId") UUID rubricaId,
            @Param("periodo") String periodo);

    Optional<Verba> findByRubricaIdAndPeriodo(UUID rubricaId, String periodo);
}
```

Adapter `JpaVerbaRepository` segue padrao de `JpaPagamentoRepository`: delega ao `SpringDataVerbaRepository` e expoe interface do dominio sem vazar tipos do Spring para o `arrecadacao-application`.

## Criterios de Sucesso

- `mvn -pl arrecadacao-infra compile` ok
- `VerbaPersistenceIT` verde com (no minimo) cenarios: insert+findById, unique violation, lock serializa duas threads
- Sem queries cross-schema; sem `EntityManager` exposto no `application`
