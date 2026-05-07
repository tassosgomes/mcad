---
status: completed
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>distribuicao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0, 4.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain layer — entidade Rubrica, repositório e migration

## Relacionada às User Stories

- [HU-01] Sincronização automática de rubricas (cobertura parcial — modelo de dados)

## Visão Geral

Implementar a camada de domínio: entidade JPA `Rubrica`, interface `RubricaRepository`, exceção `NotFoundException`, migration Flyway para criação do schema e tabela, e implementações JPA do repositório (adapter pattern).

## Requisitos

- Entidade `Rubrica` com id (UUID), sigla (unique, max 20), nome (max 100), exigeClassificacao (boolean), sincronizadoEm (Instant)
- Interface `RubricaRepository` com findAll, findBySigla, upsertBySigla
- Migration V1 criando schema `distribuicao` e tabela `rubricas`
- Implementação JPA: `SpringDataRubricaRepository` + `JpaRubricaRepository` (adapter)

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/Rubrica.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/RubricaRepository.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/exceptions/NotFoundException.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataRubricaRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaRubricaRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/resources/db/migration/V1__create_schema_and_rubricas.sql`
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Rubrica.java` (entidade fonte)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaRubricaRepository.java` (adapter pattern)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V1__create_tables.sql` (padrão de migration)
- **Skills para consultar durante implementação:**
  - `java-architecture` — padrão de Repository Adapter
  - `java-code-quality` — naming conventions, factory methods

## Subtarefas

- [ ] 2.1 Criar entidade `Rubrica.java` com JPA annotations, factory method `criar()` e método `atualizar()`
- [ ] 2.2 Criar interface `RubricaRepository.java` no domain (findAll, findBySigla, upsertBySigla)
- [ ] 2.3 Criar `NotFoundException.java` (RuntimeException com mensagem)
- [ ] 2.4 Criar migration `V1__create_schema_and_rubricas.sql`
- [ ] 2.5 Criar `SpringDataRubricaRepository.java` (extends JpaRepository, custom findBySigla)
- [ ] 2.6 Criar `JpaRubricaRepository.java` (adapter que implementa RubricaRepository)
- [ ] 2.7 Verificar que o projeto compila

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0, 4.0
- Paralelizável: Não (caminho crítico)

## Rastreabilidade

- Esta tarefa cobre: RF-04 (sigla como chave natural)
- Evidência esperada: migration executa, entidade mapeada, repositório funcional

## Detalhes de Implementação

**Entidade Rubrica:**
```java
@Entity
@Table(name = "rubricas", schema = "distribuicao")
public class Rubrica {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String sigla;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "exige_classificacao", nullable = false)
    private boolean exigeClassificacao;

    @Column(name = "sincronizado_em", nullable = false)
    private Instant sincronizadoEm;

    protected Rubrica() {} // JPA

    public static Rubrica criar(String sigla, String nome, boolean exigeClassificacao) {
        var rubrica = new Rubrica();
        rubrica.sigla = sigla;
        rubrica.nome = nome;
        rubrica.exigeClassificacao = exigeClassificacao;
        rubrica.sincronizadoEm = Instant.now();
        return rubrica;
    }

    public void atualizar(String nome, boolean exigeClassificacao) {
        this.nome = nome;
        this.exigeClassificacao = exigeClassificacao;
        this.sincronizadoEm = Instant.now();
    }

    // Getters (sem setters públicos)
}
```

**Migration V1:**
```sql
CREATE SCHEMA IF NOT EXISTS distribuicao;

CREATE TABLE distribuicao.rubricas (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sigla                VARCHAR(20)  NOT NULL UNIQUE,
    nome                 VARCHAR(100) NOT NULL,
    exige_classificacao  BOOLEAN      NOT NULL DEFAULT FALSE,
    sincronizado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uix_rubricas_sigla ON distribuicao.rubricas (sigla);
```

**Adapter pattern (JpaRubricaRepository):**
```java
@Repository
public class JpaRubricaRepository implements RubricaRepository {
    private final SpringDataRubricaRepository springData;

    @Override
    public List<Rubrica> findAll() { return springData.findAll(); }

    @Override
    public Optional<Rubrica> findBySigla(String sigla) { return springData.findBySigla(sigla); }

    @Override
    public Rubrica upsertBySigla(Rubrica rubrica) { return springData.save(rubrica); }
}
```

**Convenções da stack:**
- Entidades com factory methods estáticos (`criar`), sem setters públicos
- Construtor protegido para JPA
- Adapter pattern: interface no domain, implementação na infra

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] Migration SQL é válido (schema + tabela + índice unique)
- [ ] Entidade tem `@Entity`, `@Table(schema = "distribuicao")`, `@Column` mappings corretos
- [ ] Interface do repositório no módulo domain (sem dependência de Spring Data)
- [ ] Adapter no módulo infra implementa a interface do domain
