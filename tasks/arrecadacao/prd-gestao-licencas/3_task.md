---
status: completed
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0", "5.0"</unblocks>
</task_context>

# Tarefa 3.0: Infrastructure — repositorios JPA para Licenca e HistoricoStatusLicenca

## Relacionada as User Stories
- [HU-01] Criar Licenca (suporte — persistencia da entidade)
- [HU-02] Suspender Licenca (suporte — persistencia da transicao)
- [HU-03] Reativar Licenca (suporte — persistencia da transicao)
- [HU-04] Encerrar Licenca (suporte — persistencia da transicao)
- [HU-05] Visualizar historico (suporte — consulta de historico por licenca)
- [HU-06] Listar licencas (suporte — consulta paginada com Specification)

## Visao Geral

Implementar os adapters de repositorio na camada de infraestrutura seguindo o padrao adapter estabelecido na F02. Criar `SpringDataLicencaRepository` (interface Spring Data JPA com `JpaSpecificationExecutor`) e `JpaLicencaRepository` (classe que implementa a interface de dominio `LicencaRepository` delegando para o Spring Data). Idem para `HistoricoStatusLicenca`. Sem logica de negocio nesta camada.

## Requisitos

- `SpringDataLicencaRepository` extende `JpaRepository<Licenca, UUID>` e `JpaSpecificationExecutor<Licenca>`
- `JpaLicencaRepository` implementa `LicencaRepository` e delega para `SpringDataLicencaRepository`
- `SpringDataHistoricoStatusLicencaRepository` extende `JpaRepository<HistoricoStatusLicenca, UUID>` com metodo `findByLicencaIdOrderByDataDesc(UUID licencaId)`
- `JpaHistoricoStatusLicencaRepository` implementa `HistoricoStatusLicencaRepository` e delega para o Spring Data
- Todos os adapters anotados com `@Repository` e `@Component`
- Seguir exatamente o padrao do adapter JpaUsuarioMusicaRepository existente

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataLicencaRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaLicencaRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataHistoricoStatusLicencaRepository.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaHistoricoStatusLicencaRepository.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataUsuarioMusicaRepository.java` (padrao Spring Data)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaUsuarioMusicaRepository.java` (padrao adapter)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataHistoricoStatusUsuarioRepository.java` (padrao historico Spring Data)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaHistoricoStatusUsuarioRepository.java` (padrao historico adapter)

## Subtarefas

- [ ] 3.1 Criar `SpringDataLicencaRepository` com `JpaSpecificationExecutor`
- [ ] 3.2 Criar `JpaLicencaRepository` implementando `LicencaRepository`
- [ ] 3.3 Criar `SpringDataHistoricoStatusLicencaRepository` com metodo de busca por licenca
- [ ] 3.4 Criar `JpaHistoricoStatusLicencaRepository` implementando `HistoricoStatusLicencaRepository`
- [ ] 3.5 Verificar que o modulo infra compila sem erros

## Sequenciamento

- Bloqueado por: 2.0 (entidades e interfaces de repositorio criadas)
- Desbloqueia: 4.0 (command handlers), 5.0 (query handlers e specification)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (persistencia de criacao), RF-05/06/07 (persistencia de transicoes), RF-13 (persistencia de historico), RF-14 (consulta paginada com Specification)
- Evidencia esperada: modulo infra compila; testes de integracao de persistencia na tarefa 7.0 passarao apos esta implementacao

## Detalhes de Implementacao

**SpringDataLicencaRepository.java:**

```java
@Repository
public interface SpringDataLicencaRepository
        extends JpaRepository<Licenca, UUID>, JpaSpecificationExecutor<Licenca> {
}
```

**JpaLicencaRepository.java:**

```java
@Component
public class JpaLicencaRepository implements LicencaRepository {

    private final SpringDataLicencaRepository springData;

    public JpaLicencaRepository(SpringDataLicencaRepository springData) {
        this.springData = springData;
    }

    @Override
    public Licenca save(Licenca entity) {
        return springData.save(entity);
    }

    @Override
    public Optional<Licenca> findById(UUID id) {
        return springData.findById(id);
    }

    @Override
    public Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable) {
        return springData.findAll(spec, pageable);
    }
}
```

**SpringDataHistoricoStatusLicencaRepository.java:**

```java
@Repository
public interface SpringDataHistoricoStatusLicencaRepository
        extends JpaRepository<HistoricoStatusLicenca, UUID> {

    List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId);
}
```

**JpaHistoricoStatusLicencaRepository.java:**

```java
@Component
public class JpaHistoricoStatusLicencaRepository implements HistoricoStatusLicencaRepository {

    private final SpringDataHistoricoStatusLicencaRepository springData;

    public JpaHistoricoStatusLicencaRepository(SpringDataHistoricoStatusLicencaRepository springData) {
        this.springData = springData;
    }

    @Override
    public HistoricoStatusLicenca save(HistoricoStatusLicenca entity) {
        return springData.save(entity);
    }

    @Override
    public List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId) {
        return springData.findByLicencaIdOrderByDataDesc(licencaId);
    }
}
```

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [ ] `JpaLicencaRepository` implementa todos os metodos de `LicencaRepository`
- [ ] `JpaHistoricoStatusLicencaRepository` implementa todos os metodos de `HistoricoStatusLicencaRepository`
- [ ] `SpringDataLicencaRepository` extende `JpaSpecificationExecutor<Licenca>` (necessario para tarefa 5.0)
- [ ] Nenhuma logica de negocio nos adapters — apenas delegacao para Spring Data
