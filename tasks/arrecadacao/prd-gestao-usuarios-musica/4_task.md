---
status: completed
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0, 6.0"</unblocks>
</task_context>

# Tarefa 4.0: CQRS Foundation e Commands com handlers

## Relacionada as User Stories

- [HU-01] Cadastrar Usuario (cobertura direta — CriarUsuarioMusicaCommand)
- [HU-03] Editar Usuario (cobertura direta — AtualizarUsuarioMusicaCommand)
- [HU-04] Inativar Usuario (cobertura direta — InativarUsuarioMusicaCommand)
- [HU-05] Reativar Usuario (cobertura direta — AtivarUsuarioMusicaCommand)

## Visao Geral

Introduzir a foundation CQRS type-safe (interfaces Query, Command, Handler, Dispatchers) e implementar os 4 commands com seus handlers. A foundation CQRS e compartilhada com queries e features futuras. Se F01 ja criou Query/QueryHandler/QueryDispatcher, reutilizar e adicionar apenas Command/CommandHandler/CommandDispatcher.

## Requisitos

- CQRS interfaces: Query<R>, Command<R>, QueryHandler, CommandHandler
- QueryDispatcher e CommandDispatcher como @Component com registry automatico
- 4 Commands: Criar, Atualizar, Inativar, Ativar
- CriarCommandHandler: valida CNPJ, verifica unicidade, cria entity + historico inicial
- AtualizarCommandHandler: busca por ID, atualiza campos mutaveis
- InativarCommandHandler: busca, executa domain method, salva historico
- AtivarCommandHandler: busca, executa domain method, salva historico
- Testes unitarios para todos os handlers

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Query.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Command.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/QueryHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/CommandHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/QueryDispatcher.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/CommandDispatcher.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/CriarUsuarioMusicaCommand.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/AtualizarUsuarioMusicaCommand.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/InativarUsuarioMusicaCommand.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/AtivarUsuarioMusicaCommand.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarUsuarioMusicaCommandHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/AtualizarUsuarioMusicaCommandHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/InativarUsuarioMusicaCommandHandler.java`
  - `arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/AtivarUsuarioMusicaCommandHandler.java`
  - `arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarUsuarioMusicaCommandHandlerTest.java`
  - `arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/AtualizarUsuarioMusicaCommandHandlerTest.java`
  - `arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/InativarUsuarioMusicaCommandHandlerTest.java`
  - `arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/AtivarUsuarioMusicaCommandHandlerTest.java`
- **Modificar:**
  - `arrecadacao-application/pom.xml` (adicionar dependencia arrecadacao-domain, spring-data-jpa para Page/Pageable/Specification)
- **Referencia:**
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UsuarioMusica.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/UsuarioMusicaRepository.java`
- **Skills para consultar:**
  - `java-architecture` — CQRS type-safe, CommandDispatcher pattern
  - `java-testing` — padrao AAA, mock de repositorios

## Subtarefas

- [x] 4.1 Criar interfaces CQRS: Query<R>, Command<R>, QueryHandler, CommandHandler
- [x] 4.2 Criar QueryDispatcher e CommandDispatcher (@Component com registry via @Autowired List)
- [x] 4.3 Atualizar arrecadacao-application/pom.xml com dependencias
- [x] 4.4 Criar CriarUsuarioMusicaCommand (record) + Handler
- [x] 4.5 Criar AtualizarUsuarioMusicaCommand (record) + Handler
- [x] 4.6 Criar InativarUsuarioMusicaCommand (record) + Handler
- [x] 4.7 Criar AtivarUsuarioMusicaCommand (record) + Handler
- [x] 4.8 Testes unitarios para os 4 handlers (mock repositories)

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 5.0, 6.0
- Paralelizavel: Nao (5.0 pode comecar apos 4.1-4.3 se dispatcher foundation estiver pronta)

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-06, RF-07, RF-11, RF-12, RF-13
- Evidencia esperada: testes unitarios dos handlers passam; CNPJ duplicado gera CnpjDuplicadoException

## Detalhes de Implementacao

**CQRS Dispatcher pattern:**
```java
@Component
public class CommandDispatcher {
    private final Map<Class<?>, CommandHandler<?, ?>> handlers;

    @Autowired
    public CommandDispatcher(List<CommandHandler<?, ?>> handlerList) {
        // Build registry mapping command type → handler
        // Use reflection on generic type parameter
    }

    @SuppressWarnings("unchecked")
    public <C extends Command<R>, R> R dispatch(C command) {
        CommandHandler<C, R> handler = (CommandHandler<C, R>) handlers.get(command.getClass());
        if (handler == null) throw new IllegalArgumentException("No handler for " + command.getClass());
        return handler.handle(command);
    }
}
```

**CriarUsuarioMusicaCommandHandler:**
```java
@Component
public class CriarUsuarioMusicaCommandHandler
        implements CommandHandler<CriarUsuarioMusicaCommand, UsuarioMusicaResponse> {

    private final UsuarioMusicaRepository repository;
    private final HistoricoStatusUsuarioRepository historicoRepository;

    @Override
    @Transactional
    public UsuarioMusicaResponse handle(CriarUsuarioMusicaCommand cmd) {
        Cnpj cnpj = Cnpj.criar(cmd.cnpj()); // valida modulo 11
        if (repository.existsByCnpj(cnpj)) {
            throw new CnpjDuplicadoException(cnpj.getFormatado());
        }
        Endereco endereco = new Endereco(cmd.endereco().cep(), ...);
        Contato contato = new Contato(cmd.contato().nomeResponsavel(), ...);
        UsuarioMusica entity = UsuarioMusica.criar(cmd.razaoSocial(), cmd.nomeFantasia(), cnpj, endereco, contato);
        repository.save(entity);
        // Historico inicial
        HistoricoStatusUsuario historico = HistoricoStatusUsuario.criar(
            entity.getId(), null, StatusUsuarioMusica.ATIVO, "Cadastro inicial", cmd.autor());
        historicoRepository.save(historico);
        return mapToResponse(entity);
    }
}
```

**Padrao de teste (AAA — Arrange-Act-Assert):**
```java
@ExtendWith(MockitoExtension.class)
class CriarUsuarioMusicaCommandHandlerTest {
    @Mock private UsuarioMusicaRepository repository;
    @Mock private HistoricoStatusUsuarioRepository historicoRepository;
    @InjectMocks private CriarUsuarioMusicaCommandHandler handler;

    @Test
    void deveCriarUsuarioComSucesso() {
        // Arrange: command com dados validos, existsByCnpj retorna false
        // Act: handler.handle(command)
        // Assert: verify save called, response has ATIVO status
    }

    @Test
    void deveRejeitarCnpjDuplicado() {
        // Arrange: existsByCnpj retorna true
        // Act + Assert: assertThatThrownBy → CnpjDuplicadoException
    }

    @Test
    void deveRejeitarCnpjInvalido() {
        // Arrange: cnpj com digitos errados
        // Act + Assert: assertThatThrownBy → IllegalArgumentException
    }
}
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [x] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [x] CriarHandler: happy path, CNPJ duplicado (CnpjDuplicadoException), CNPJ invalido
- [x] AtualizarHandler: happy path, not found (EntidadeNaoEncontradaException)
- [x] InativarHandler: happy path, ja inativo (IllegalStateException)
- [x] AtivarHandler: happy path, ja ativo (IllegalStateException)
