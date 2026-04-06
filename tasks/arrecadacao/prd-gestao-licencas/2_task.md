---
status: completed
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain Layer — entidades, enum e interfaces de repositorio

## Relacionada as User Stories
- [HU-01] Criar Licenca (cobertura direta — factory method Licenca.criar())
- [HU-02] Suspender Licenca (cobertura direta — domain method suspender())
- [HU-03] Reativar Licenca (cobertura direta — domain method reativar())
- [HU-04] Encerrar Licenca (cobertura direta — domain method encerrar())
- [HU-05] Visualizar historico de status (suporte — entidade HistoricoStatusLicenca)

## Visao Geral

Implementar a camada de dominio completa para licencas: enum `StatusLicenca`, entidade `Licenca` com factory method e 3 domain methods com guards de transicao de estado, entidade `HistoricoStatusLicenca` com factory method, e interfaces de repositorio `LicencaRepository` e `HistoricoStatusLicencaRepository`. Inclui testes unitarios para todos os domain methods. A entidade `Licenca` possui relacionamentos `@ManyToOne(fetch=LAZY, insertable=false, updatable=false)` para `UsuarioMusica` e `Rubrica` para suportar o `LicencaSpecification` na camada de aplicacao.

## Requisitos

- Enum `StatusLicenca` com valores ATIVA, SUSPENSA, ENCERRADA
- Entidade `Licenca` com factory method `criar()` validando datas
- Factory method rejeita: dataInicio null, dataInicio anterior a hoje, dataFim nao nula e anterior ou igual a dataInicio
- Domain method `suspender()`: guard status == ATIVA, senao throws IllegalStateException
- Domain method `reativar()`: guard status == SUSPENSA, senao throws IllegalStateException
- Domain method `encerrar()`: guard status == SUSPENSA (ATIVA diretamente e proibido), senao throws IllegalStateException com mensagens distintas
- Todos os domain methods retornam `HistoricoStatusLicenca` criado
- Entidade nao expoe setters; usuarioMusicaId e rubricaId sao imutaveis apos criacao
- `@ManyToOne(fetch=LAZY, insertable=false, updatable=false)` para UsuarioMusica e Rubrica na entidade Licenca
- `HistoricoStatusLicenca.criar()` valida justificativa nao nula e com minimo 10 caracteres
- Interfaces de repositorio seguem o padrao de `LicencaRepository` com `findAll(Specification, Pageable)`
- Testes unitarios para `LicencaTest` e `HistoricoStatusLicencaTest`

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/enums/StatusLicenca.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Licenca.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/HistoricoStatusLicenca.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/LicencaRepository.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/HistoricoStatusLicencaRepository.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/LicencaTest.java`
  - `services/arrecadacao-api/arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/HistoricoStatusLicencaTest.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UsuarioMusica.java` (padrão de entidade existente)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/HistoricoStatusUsuario.java` (padrão de historico existente)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/UsuarioMusicaRepository.java` (padrão de interface de repositorio)
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/enums/StatusUsuarioMusica.java` (padrao de enum)

## Subtarefas

- [ ] 2.1 Criar enum `StatusLicenca` (ATIVA, SUSPENSA, ENCERRADA)
- [ ] 2.2 Criar entidade `HistoricoStatusLicenca` com factory method e validacao de justificativa
- [ ] 2.3 Criar entidade `Licenca` com factory method, 3 domain methods e @ManyToOne lazy
- [ ] 2.4 Criar interfaces `LicencaRepository` e `HistoricoStatusLicencaRepository`
- [ ] 2.5 Criar `LicencaTest` com todos os cenarios de factory e domain methods
- [ ] 2.6 Criar `HistoricoStatusLicencaTest` com cenarios de factory

## Sequenciamento

- Bloqueado por: 1.0 (migrations V5 e V6 criadas)
- Desbloqueia: 3.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (criacao de licenca), RF-02 (multiplas licencas permitidas), RF-03 (vigencia dataFim nullable), RF-04 (status inicial ATIVA), RF-05 (suspender ATIVA), RF-06 (reativar SUSPENSA), RF-07 (encerrar SUSPENSA), RF-08 (nao encerrar ATIVA diretamente), RF-09 (nao reativar ENCERRADA), RF-11 (historico de transicoes), RF-12 (justificativa obrigatoria), RF-13 (historico criado no domain method)
- Evidencia esperada: testes unitarios passam; build do modulo domain compila

## Detalhes de Implementacao

**StatusLicenca.java:**

```java
public enum StatusLicenca {
    ATIVA, SUSPENSA, ENCERRADA
}
```

**Licenca.java (estrutura):**

```java
@Entity
@Table(name = "licencas", schema = "arrecadacao")
public class Licenca {
    @Id
    private UUID id;

    @Column(name = "usuario_musica_id", nullable = false)
    private UUID usuarioMusicaId;

    @Column(name = "rubrica_id", nullable = false)
    private UUID rubricaId;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;  // nullable = vigencia indefinida

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15, nullable = false)
    private StatusLicenca status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    // Relacionamentos somente leitura para suportar Specification com join
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_musica_id", insertable = false, updatable = false)
    private UsuarioMusica usuarioMusica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubrica_id", insertable = false, updatable = false)
    private Rubrica rubrica;

    protected Licenca() {}

    public static Licenca criar(UUID usuarioMusicaId, UUID rubricaId,
                                LocalDate dataInicio, LocalDate dataFim) {
        Objects.requireNonNull(usuarioMusicaId, "usuarioMusicaId e obrigatorio");
        Objects.requireNonNull(rubricaId, "rubricaId e obrigatorio");
        Objects.requireNonNull(dataInicio, "dataInicio e obrigatorio");
        if (dataInicio.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("dataInicio nao pode ser anterior a hoje");
        }
        if (dataFim != null && !dataFim.isAfter(dataInicio)) {
            throw new IllegalArgumentException("dataFim deve ser posterior a dataInicio");
        }
        var licenca = new Licenca();
        licenca.id = UUID.randomUUID();
        licenca.usuarioMusicaId = usuarioMusicaId;
        licenca.rubricaId = rubricaId;
        licenca.dataInicio = dataInicio;
        licenca.dataFim = dataFim;
        licenca.status = StatusLicenca.ATIVA;
        licenca.criadoEm = Instant.now();
        licenca.atualizadoEm = Instant.now();
        return licenca;
    }

    public HistoricoStatusLicenca suspender(String justificativa, String autor) {
        if (status != StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Licenca nao pode ser suspensa pois nao esta ATIVA. Status atual: " + status);
        }
        var anterior = this.status;
        this.status = StatusLicenca.SUSPENSA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.SUSPENSA, justificativa, autor);
    }

    public HistoricoStatusLicenca reativar(String justificativa, String autor) {
        if (status != StatusLicenca.SUSPENSA) {
            throw new IllegalStateException(
                "Licenca nao pode ser reativada pois nao esta SUSPENSA. Status atual: " + status);
        }
        var anterior = this.status;
        this.status = StatusLicenca.ATIVA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.ATIVA, justificativa, autor);
    }

    public HistoricoStatusLicenca encerrar(String justificativa, String autor) {
        if (status == StatusLicenca.ATIVA) {
            throw new IllegalStateException(
                "Licenca deve ser suspensa antes de ser encerrada");
        }
        if (status == StatusLicenca.ENCERRADA) {
            throw new IllegalStateException("Licenca ja esta encerrada");
        }
        var anterior = this.status;
        this.status = StatusLicenca.ENCERRADA;
        this.atualizadoEm = Instant.now();
        return HistoricoStatusLicenca.criar(id, anterior, StatusLicenca.ENCERRADA, justificativa, autor);
    }

    // Getters apenas — sem setters publicos
}
```

**HistoricoStatusLicenca.java (estrutura):**

```java
@Entity
@Table(name = "historico_status_licenca", schema = "arrecadacao")
public class HistoricoStatusLicenca {
    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 15)
    private StatusLicenca statusAnterior;  // null na criacao inicial

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", length = 15, nullable = false)
    private StatusLicenca statusNovo;

    @Column(name = "justificativa", length = 500, nullable = false)
    private String justificativa;

    @Column(name = "autor", length = 100, nullable = false)
    private String autor;

    @Column(name = "data", nullable = false)
    private Instant data;

    protected HistoricoStatusLicenca() {}

    public static HistoricoStatusLicenca criar(UUID licencaId,
            StatusLicenca statusAnterior, StatusLicenca statusNovo,
            String justificativa, String autor) {
        Objects.requireNonNull(licencaId, "licencaId e obrigatorio");
        Objects.requireNonNull(statusNovo, "statusNovo e obrigatorio");
        Objects.requireNonNull(justificativa, "justificativa e obrigatoria");
        if (justificativa.trim().length() < 10) {
            throw new IllegalArgumentException("Justificativa deve ter no minimo 10 caracteres");
        }
        var historico = new HistoricoStatusLicenca();
        historico.id = UUID.randomUUID();
        historico.licencaId = licencaId;
        historico.statusAnterior = statusAnterior;
        historico.statusNovo = statusNovo;
        historico.justificativa = justificativa;
        historico.autor = autor;
        historico.data = Instant.now();
        return historico;
    }

    // Getters apenas
}
```

**LicencaRepository.java:**

```java
public interface LicencaRepository {
    Licenca save(Licenca entity);
    Optional<Licenca> findById(UUID id);
    Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable);
}
```

**HistoricoStatusLicencaRepository.java:**

```java
public interface HistoricoStatusLicencaRepository {
    HistoricoStatusLicenca save(HistoricoStatusLicenca entity);
    List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId);
}
```

**Cenarios de teste para LicencaTest:**
- `criar()` com datas validas — sucesso, status ATIVA
- `criar()` com dataInicio anterior a hoje — lanca IllegalArgumentException
- `criar()` com dataFim igual a dataInicio — lanca IllegalArgumentException
- `criar()` com dataFim anterior a dataInicio — lanca IllegalArgumentException
- `criar()` com dataFim null — sucesso (vigencia indefinida)
- `suspender()` de ATIVA — sucesso, retorna historico ATIVA→SUSPENSA
- `suspender()` de SUSPENSA — lanca IllegalStateException
- `suspender()` de ENCERRADA — lanca IllegalStateException
- `reativar()` de SUSPENSA — sucesso, retorna historico SUSPENSA→ATIVA
- `reativar()` de ATIVA — lanca IllegalStateException
- `reativar()` de ENCERRADA — lanca IllegalStateException
- `encerrar()` de SUSPENSA — sucesso, retorna historico SUSPENSA→ENCERRADA
- `encerrar()` de ATIVA — lanca IllegalStateException com mensagem "deve ser suspensa antes"
- `encerrar()` de ENCERRADA — lanca IllegalStateException com mensagem "ja esta encerrada"

**Cenarios de teste para HistoricoStatusLicencaTest:**
- `criar()` com todos os campos validos — sucesso
- `criar()` com justificativa null — lanca NullPointerException ou IllegalArgumentException
- `criar()` com justificativa com menos de 10 chars — lanca IllegalArgumentException
- `criar()` com statusAnterior null (criacao inicial) — sucesso

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-domain`
- [ ] Testes unitarios passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-domain`
- [ ] `LicencaTest` — todos os 14 cenarios passam
- [ ] `HistoricoStatusLicencaTest` — todos os 4 cenarios passam
- [ ] Entidade `Licenca` nao tem setters publicos (exceto via factory/domain methods)
- [ ] `@ManyToOne` esta com `insertable=false, updatable=false` — nao interfere em persist
