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
<unblocks>"4.0, 5.0"</unblocks>
</task_context>

# Tarefa 3.0: Infrastructure — repositorios JPA e Spring Data

## Relacionada as User Stories

- [HU-01] Cadastrar (suporte — persistencia)
- [HU-06] Consultar (suporte — queries)
- [HU-07] Historico (suporte — persistencia historico)

## Visao Geral

Implementar os repositorios de infraestrutura seguindo o padrao adapter do F01: interfaces Spring Data (`SpringData*Repository`) e adapters JPA (`Jpa*Repository`) que implementam as interfaces de dominio. Introduz suporte a `JpaSpecificationExecutor` para filtros dinamicos.

## Requisitos

- SpringDataUsuarioMusicaRepository: extends JpaRepository + JpaSpecificationExecutor
- JpaUsuarioMusicaRepository: implementa UsuarioMusicaRepository delegando para SpringData
- SpringDataHistoricoStatusUsuarioRepository: extends JpaRepository
- JpaHistoricoStatusUsuarioRepository: implementa HistoricoStatusUsuarioRepository
- Metodo `existsByCnpj` para verificacao de unicidade

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataUsuarioMusicaRepository.java`
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaUsuarioMusicaRepository.java`
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataHistoricoStatusUsuarioRepository.java`
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaHistoricoStatusUsuarioRepository.java`
- **Referencia:**
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaRubricaRepository.java` (padrao adapter)
  - `arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataRubricaRepository.java` (padrao Spring Data)
- **Skills para consultar:**
  - `java-architecture` — padrao adapter repository, JpaSpecificationExecutor

## Subtarefas

- [x] 3.1 Criar SpringDataUsuarioMusicaRepository (JpaRepository + JpaSpecificationExecutor)
- [x] 3.2 Criar JpaUsuarioMusicaRepository implementando UsuarioMusicaRepository
- [x] 3.3 Criar SpringDataHistoricoStatusUsuarioRepository (JpaRepository)
- [x] 3.4 Criar JpaHistoricoStatusUsuarioRepository implementando HistoricoStatusUsuarioRepository
- [x] 3.5 Verificar compilacao e integracao com entidades do dominio

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0, 5.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-03 (existsByCnpj), RF-14 (findByUsuarioMusicaId), RF-16 (findAll com Specification)
- Evidencia esperada: compilacao ok; repositorios integram com entidades

## Detalhes de Implementacao

**SpringDataUsuarioMusicaRepository:**
```java
public interface SpringDataUsuarioMusicaRepository
        extends JpaRepository<UsuarioMusica, UUID>,
                JpaSpecificationExecutor<UsuarioMusica> {
    boolean existsByCnpj(Cnpj cnpj);
}
```

**JpaUsuarioMusicaRepository (adapter):**
```java
@Repository
public class JpaUsuarioMusicaRepository implements UsuarioMusicaRepository {
    private final SpringDataUsuarioMusicaRepository springData;

    // Delegate all methods to springData
    // findAll(Specification, Pageable) delegated directly
}
```

**SpringDataHistoricoStatusUsuarioRepository:**
```java
public interface SpringDataHistoricoStatusUsuarioRepository
        extends JpaRepository<HistoricoStatusUsuario, UUID> {
    List<HistoricoStatusUsuario> findByUsuarioMusicaIdOrderByDataDesc(UUID usuarioMusicaId);
}
```

**Nota sobre Cnpj como @Embeddable em queries:**
O `existsByCnpj(Cnpj cnpj)` no Spring Data resolve automaticamente para `WHERE cnpj = :valor` pois Cnpj e @Embeddable com campo `valor`. Se der problema, usar `@Query("SELECT COUNT(u) > 0 FROM UsuarioMusica u WHERE u.cnpj.valor = :valor")`.

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [x] Repositorios implementam interfaces de dominio corretamente
- [x] JpaSpecificationExecutor disponivel para filtros dinamicos
