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

# Tarefa 2.0: Domain Layer — entidades, Value Objects, enums e interfaces

## Relacionada as User Stories

- [HU-01] Cadastrar Usuario de Musica (cobertura direta — entity + Cnpj VO)
- [HU-03] Editar Usuario (cobertura direta — metodo atualizar)
- [HU-04] Inativar Usuario (cobertura direta — metodo inativar)
- [HU-05] Reativar Usuario (cobertura direta — metodo ativar)
- [HU-07] Historico de status (cobertura direta — entity HistoricoStatusUsuario)

## Visao Geral

Implementar a camada de dominio completa: enum StatusUsuarioMusica, Value Object Cnpj com algoritmo modulo 11 (suporte alfanumerico RFB), Embeddables Endereco e Contato, entidades UsuarioMusica e HistoricoStatusUsuario, excecoes de dominio e interfaces de repositorio. Inclui testes unitarios de dominio.

## Requisitos

- Cnpj: @Embeddable, factory method `criar()`, validacao modulo 11, ASCII-48 para alfanumerico, formatacao AA.BBB.CCC/DDDD-EE
- Endereco: @Embeddable, 7 campos (cep, logradouro, numero, complemento, bairro, cidade, uf)
- Contato: @Embeddable, 3 campos (nomeResponsavel obrigatorio, telefone, email opcionais)
- UsuarioMusica: factory `criar()`, metodos `atualizar()`, `inativar()`, `ativar()` com guards
- HistoricoStatusUsuario: factory `criar()`, validacao justificativa >= 10 chars
- Excecoes: CnpjDuplicadoException, EntidadeNaoEncontradaException
- Repository interfaces no pacote domain.interfaces

## Arquivos Envolvidos

- **Criar:**
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/enums/StatusUsuarioMusica.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/valueobjects/Cnpj.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/valueobjects/Endereco.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/valueobjects/Contato.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/UsuarioMusica.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/HistoricoStatusUsuario.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/UsuarioMusicaRepository.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/HistoricoStatusUsuarioRepository.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/CnpjDuplicadoException.java`
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/exceptions/EntidadeNaoEncontradaException.java`
  - `arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/valueobjects/CnpjTest.java`
  - `arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/UsuarioMusicaTest.java`
  - `arrecadacao-domain/src/test/java/br/com/ecad/arrecadacao/domain/entities/HistoricoStatusUsuarioTest.java`
- **Referencia:**
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Rubrica.java` (padrao de entidade)
  - `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/OutboxEvent.java` (padrao factory + domain methods)
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs` (referencia: algoritmo modulo 11)
- **Skills para consultar:**
  - `java-architecture` — padrao de Entity, Value Object, Repository interface
  - `java-code-quality` — naming, imutabilidade, records vs classes

## Subtarefas

- [x] 2.1 Criar enum StatusUsuarioMusica (ATIVO, INATIVO)
- [x] 2.2 Criar Value Object Cnpj (@Embeddable) com factory `criar()`, modulo 11 alfanumerico, `getFormatado()`
- [x] 2.3 Criar Embeddable Endereco (7 campos, protected no-arg constructor, getters only)
- [x] 2.4 Criar Embeddable Contato (3 campos, nomeResponsavel obrigatorio)
- [x] 2.5 Criar entidade UsuarioMusica com factory `criar()` e metodos de dominio
- [x] 2.6 Criar entidade HistoricoStatusUsuario com factory `criar()` e validacao justificativa
- [x] 2.7 Criar excecoes CnpjDuplicadoException e EntidadeNaoEncontradaException
- [x] 2.8 Criar interfaces UsuarioMusicaRepository e HistoricoStatusUsuarioRepository
- [x] 2.9 Testes unitarios: CnpjTest, UsuarioMusicaTest, HistoricoStatusUsuarioTest

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03 (estrutura), RF-04, RF-05, RF-06, RF-07, RF-11, RF-12, RF-13
- Evidencia esperada: testes unitarios passam; todas as classes compilam

## Detalhes de Implementacao

**Cnpj — Algoritmo modulo 11 (conversao alfanumerica):**
- Referencia: `Cadastro.Domain.ValueObjects.Cnpj` (.NET)
- Strip non-alphanumeric, uppercase
- Length == 14; posicoes 12-13 devem ser digitos numericos
- Conversao: `char - 48` (digitos 0-9 → 0-9; letras A-Z → 17-42)
- DV1: pesos [5,4,3,2,9,8,7,6,5,4,3,2] sobre posicoes 0-11
- DV2: pesos [6,5,4,3,2,9,8,7,6,5,4,3,2] sobre posicoes 0-12 (inclui DV1 calculado)
- Resto = soma % 11; DV = resto < 2 ? 0 : 11 - resto
- Throws `IllegalArgumentException("CNPJ invalido")` se falhar

**UsuarioMusica — Domain methods:**
```java
public static UsuarioMusica criar(String razaoSocial, String nomeFantasia,
                                   Cnpj cnpj, Endereco endereco, Contato contato) {
    // razaoSocial != null && length >= 3
    // id = UUID.randomUUID(), status = ATIVO, criadoEm/atualizadoEm = Instant.now()
}

public void atualizar(String razaoSocial, String nomeFantasia,
                      Endereco endereco, Contato contato) {
    // CNPJ e status nao mudam
    // atualizadoEm = Instant.now()
}

public HistoricoStatusUsuario inativar(String justificativa, String autor) {
    // Guard: if (status != ATIVO) throw IllegalStateException("ja INATIVO")
    // status = INATIVO, atualizadoEm = now
    // return HistoricoStatusUsuario.criar(id, ATIVO, INATIVO, justificativa, autor)
}

public HistoricoStatusUsuario ativar(String justificativa, String autor) {
    // Guard: if (status != INATIVO) throw IllegalStateException("ja ATIVO")
    // status = ATIVO, atualizadoEm = now
    // return HistoricoStatusUsuario.criar(id, INATIVO, ATIVO, justificativa, autor)
}
```

**Repository interfaces:**
```java
public interface UsuarioMusicaRepository {
    UsuarioMusica save(UsuarioMusica entity);
    Optional<UsuarioMusica> findById(UUID id);
    boolean existsByCnpj(Cnpj cnpj);
    Page<UsuarioMusica> findAll(Specification<UsuarioMusica> spec, Pageable pageable);
}

public interface HistoricoStatusUsuarioRepository {
    HistoricoStatusUsuario save(HistoricoStatusUsuario entity);
    List<HistoricoStatusUsuario> findByUsuarioMusicaIdOrderByDataDesc(UUID usuarioMusicaId);
}
```

**Convencoes da stack:**
- Entidades imutaveis: getters only, no setters (conforme Rubrica.java existente)
- Protected no-arg constructor para JPA
- Factory methods para criacao (conforme OutboxEvent.criar())
- equals/hashCode no Cnpj baseado em `valor`

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-domain`
- [x] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-domain`
- [x] CnpjTest: CNPJ numerico valido aceito, alfanumerico valido aceito, invalido rejeitado, formatacao correta
- [x] UsuarioMusicaTest: criar() gera ATIVO, inativar() muda para INATIVO, ativar() de INATIVO volta ATIVO, inativar() de INATIVO throws
- [x] HistoricoStatusUsuarioTest: criar() com justificativa < 10 chars throws
