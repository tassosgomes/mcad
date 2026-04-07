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
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Commands, handlers e testes unitarios

## Relacionada as User Stories
- [HU-01] Criar Licenca (cobertura direta — CriarLicencaCommandHandler)
- [HU-02] Suspender Licenca (cobertura direta — SuspenderLicencaCommandHandler)
- [HU-03] Reativar Licenca (cobertura direta — ReativarLicencaCommandHandler)
- [HU-04] Encerrar Licenca (cobertura direta — EncerrarLicencaCommandHandler)

## Visao Geral

Implementar os 4 commands (records imutaveis) e seus respectivos handlers na camada de aplicacao. O `CriarLicencaCommandHandler` e o mais complexo: valida que o `UsuarioMusica` existe e esta ATIVO, valida que a `Rubrica` existe, cria a entidade via domain factory, persiste e registra o historico inicial. Os handlers de transicao (suspender, reativar, encerrar) buscam a licenca, delegam ao domain method (que controla os guards) e persistem os resultados. Inclui testes unitarios com mocks de repositorios para todos os handlers.

## Requisitos

- 4 records de command: `CriarLicencaCommand`, `SuspenderLicencaCommand`, `ReativarLicencaCommand`, `EncerrarLicencaCommand`
- `CriarLicencaCommandHandler`: busca UsuarioMusica → 404 se nao encontrado; valida status ATIVO → 422 se INATIVO; busca Rubrica → 404 se nao encontrada; cria via `Licenca.criar()`; persiste licenca; cria e persiste historico inicial (statusAnterior=null, statusNovo=ATIVA, justificativa="Licenca criada", autor=cmd.autor())
- Handler de criacao mapeia para `LicencaResponse` buscando dados expandidos de UsuarioMusica e Rubrica
- Handlers de transicao: findById → 404 se nao encontrado; chama domain method; persiste licenca + historico retornado; mapeia para `LicencaResponse`
- `IllegalStateException` do domain method deve ser convertida para resposta 422 pelo `GlobalExceptionHandler` existente
- Testes unitarios com Mockito para todos os 4 handlers (happy path + cenarios de erro)
- DTOs request/response definidos nesta tarefa (CriarLicencaRequest, TransicaoStatusRequest, LicencaResponse, UsuarioMusicaResumoResponse, RubricaResumoResponse)

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/CriarLicencaCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/SuspenderLicencaCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/ReativarLicencaCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/EncerrarLicencaCommand.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarLicencaCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/SuspenderLicencaCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/ReativarLicencaCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/EncerrarLicencaCommandHandler.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/CriarLicencaRequest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/TransicaoStatusRequest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/LicencaResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/UsuarioMusicaResumoResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/dto/RubricaResumoResponse.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarLicencaCommandHandlerTest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/SuspenderLicencaCommandHandlerTest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/ReativarLicencaCommandHandlerTest.java`
  - `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/EncerrarLicencaCommandHandlerTest.java`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/CriarUsuarioMusicaCommandHandler.java` (padrao de handler)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/InativarUsuarioMusicaCommandHandler.java` (padrao de transicao de status)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/Command.java` (interface CQRS)
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/cqrs/CommandHandler.java` (interface CQRS)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (tratamento de IllegalStateException → 422)

## Subtarefas

- [ ] 4.1 Criar os 4 records de command
- [ ] 4.2 Criar os DTOs: CriarLicencaRequest, TransicaoStatusRequest, LicencaResponse, UsuarioMusicaResumoResponse, RubricaResumoResponse
- [ ] 4.3 Implementar CriarLicencaCommandHandler com validacao de UsuarioMusica ATIVO e Rubrica existente
- [ ] 4.4 Implementar SuspenderLicencaCommandHandler
- [ ] 4.5 Implementar ReativarLicencaCommandHandler
- [ ] 4.6 Implementar EncerrarLicencaCommandHandler
- [ ] 4.7 Criar testes unitarios para os 4 handlers
- [ ] 4.8 Verificar que GlobalExceptionHandler ja trata IllegalStateException com 422 (senao adicionar)

## Sequenciamento

- Bloqueado por: 3.0 (repositorios JPA disponiveis)
- Desbloqueia: 5.0 (queries podem ser feitas em paralelo com 4.0 pois DTOs estao aqui)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (criar licenca), RF-03 (validar UsuarioMusica ATIVO), RF-07 (suspender), RF-08 (reativar), RF-09 (encerrar), RF-11 (historico gerado em cada transicao)
- Evidencia esperada: testes unitarios de todos os handlers passam; modulo application compila

## Detalhes de Implementacao

**Commands (records):**

```java
public record CriarLicencaCommand(
    UUID usuarioMusicaId, UUID rubricaId,
    LocalDate dataInicio, LocalDate dataFim, String autor
) implements Command<LicencaResponse> {}

public record SuspenderLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}

public record ReativarLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}

public record EncerrarLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}
```

**DTOs:**

```java
public record LicencaResponse(
    UUID id,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica,
    LocalDate dataInicio, LocalDate dataFim,
    String status,
    Instant criadoEm, Instant atualizadoEm
) {}

public record UsuarioMusicaResumoResponse(
    UUID id, String razaoSocial, String cnpjFormatado
) {}

public record RubricaResumoResponse(
    UUID id, String sigla, String nome
) {}

public record CriarLicencaRequest(
    @NotNull UUID usuarioMusicaId,
    @NotNull UUID rubricaId,
    @NotNull LocalDate dataInicio,
    LocalDate dataFim  // nullable — vigencia indefinida
) {}

public record TransicaoStatusRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
```

**CriarLicencaCommandHandler (logica principal):**

```java
@Component
public class CriarLicencaCommandHandler implements CommandHandler<CriarLicencaCommand, LicencaResponse> {

    private final LicencaRepository licencaRepository;
    private final HistoricoStatusLicencaRepository historicoRepository;
    private final UsuarioMusicaRepository usuarioMusicaRepository;
    private final RubricaRepository rubricaRepository;

    @Override
    @Transactional
    public LicencaResponse handle(CriarLicencaCommand cmd) {
        // 1. Validar UsuarioMusica existe e esta ATIVO
        var usuarioMusica = usuarioMusicaRepository.findById(cmd.usuarioMusicaId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "UsuarioMusica nao encontrado: " + cmd.usuarioMusicaId()));

        if (usuarioMusica.getStatus() != StatusUsuarioMusica.ATIVO) {
            throw new IllegalStateException(
                "Nao e possivel criar licenca para usuario INATIVO");
        }

        // 2. Validar Rubrica existe
        var rubrica = rubricaRepository.findById(cmd.rubricaId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Rubrica nao encontrada: " + cmd.rubricaId()));

        // 3. Criar entidade via domain factory (valida datas)
        var licenca = Licenca.criar(
            cmd.usuarioMusicaId(), cmd.rubricaId(),
            cmd.dataInicio(), cmd.dataFim());

        licencaRepository.save(licenca);

        // 4. Criar historico inicial
        var historico = HistoricoStatusLicenca.criar(
            licenca.getId(), null, StatusLicenca.ATIVA,
            "Licenca criada", cmd.autor());
        historicoRepository.save(historico);

        // 5. Mapear para response com dados expandidos
        return toResponse(licenca, usuarioMusica, rubrica);
    }
}
```

**Handlers de transicao (padrao compartilhado):**

```java
@Component
public class SuspenderLicencaCommandHandler implements CommandHandler<SuspenderLicencaCommand, LicencaResponse> {

    @Override
    @Transactional
    public LicencaResponse handle(SuspenderLicencaCommand cmd) {
        var licenca = licencaRepository.findById(cmd.id())
            .orElseThrow(() -> new EntidadeNaoEncontradaException("Licenca nao encontrada: " + cmd.id()));

        // Domain method com guard — throws IllegalStateException se transicao invalida
        var historico = licenca.suspender(cmd.justificativa(), cmd.autor());

        licencaRepository.save(licenca);
        historicoRepository.save(historico);

        var usuarioMusica = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
        var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();
        return toResponse(licenca, usuarioMusica, rubrica);
    }
}
// Reativar e Encerrar seguem o mesmo padrao
```

**Cenarios de teste — CriarLicencaCommandHandlerTest:**
- Happy path: usuario ATIVO + rubrica existe → licenca criada, historico gerado, response correto
- UsuarioMusica nao encontrado → lanca EntidadeNaoEncontradaException
- UsuarioMusica INATIVO → lanca IllegalStateException
- Rubrica nao encontrada → lanca EntidadeNaoEncontradaException

**Cenarios de teste — SuspenderLicencaCommandHandlerTest:**
- Happy path: licenca ATIVA → suspensa, historico gerado
- Licenca nao encontrada → lanca EntidadeNaoEncontradaException
- Licenca ja SUSPENSA → IllegalStateException (propagada do domain)

**Cenarios de teste — ReativarLicencaCommandHandlerTest:**
- Happy path: licenca SUSPENSA → ativa, historico gerado
- Licenca nao encontrada → lanca EntidadeNaoEncontradaException
- Licenca ja ATIVA → IllegalStateException (propagada do domain)

**Cenarios de teste — EncerrarLicencaCommandHandlerTest:**
- Happy path: licenca SUSPENSA → encerrada, historico gerado
- Licenca nao encontrada → lanca EntidadeNaoEncontradaException
- Licenca ATIVA diretamente → IllegalStateException "deve ser suspensa antes"
- Licenca ja ENCERRADA → IllegalStateException "ja esta encerrada"

**Verificar GlobalExceptionHandler:**
O `GlobalExceptionHandler` existente deve ter handler para `IllegalStateException` retornando HTTP 422.
Se nao existir, adicionar:

```java
@ExceptionHandler(IllegalStateException.class)
public ProblemDetail handleIllegalState(IllegalStateException ex) {
    var pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    pd.setTitle("Operacao invalida");
    return pd;
}
```

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-application`
- [ ] Testes unitarios passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-application`
- [ ] `CriarLicencaCommandHandlerTest` — 4 cenarios passam
- [ ] `SuspenderLicencaCommandHandlerTest` — 3 cenarios passam
- [ ] `ReativarLicencaCommandHandlerTest` — 3 cenarios passam
- [ ] `EncerrarLicencaCommandHandlerTest` — 4 cenarios passam
- [ ] Criacao com usuario INATIVO retorna 422 (via GlobalExceptionHandler tratando IllegalStateException)
- [ ] Criacao com usuario/rubrica inexistente retorna 404 (via EntidadeNaoEncontradaException)
