---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>cadastro/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Entidades de Domínio do Portal e State Machines

## Visão Geral

Criar as 3 novas entidades de domínio (`CredencialTitular`, `Ocorrencia`, `SolicitacaoAlteracao`) com suas state machines, os enums de suporte, a extensão da entidade `Titular` (campos e método de contato), as interfaces de repositório e as constantes de eventos em `EventTypes.cs`.

## Requisitos

- RF-04 (senha só como hash), RF-14 a RF-21 (solicitações), RF-27 a RF-39 (ocorrências + state machine)
- Tech Spec — seções *Modelos de Dados*, *Interfaces Principais*, *Eventos*

## Subtarefas

- [ ] 2.1 Criar `3-Domain/Cadastro.Domain/Enums/TipoOcorrencia.cs` — `TITULARIDADE_DIVERGENTE`, `FONOGRAMA_INCORRETO`, `DADO_CADASTRAL`, `OBRA_AUSENTE`.
- [ ] 2.2 Criar `3-Domain/Cadastro.Domain/Enums/StatusOcorrencia.cs` — `ABERTA`, `EM_ANALISE`, `RESOLVIDA`, `CANCELADA`.
- [ ] 2.3 Criar `3-Domain/Cadastro.Domain/Enums/CampoSolicitacao.cs` — `NOME`, `CAE_IPI`, `ASSOCIACAO`, `CATEGORIA`.
- [ ] 2.4 Criar `3-Domain/Cadastro.Domain/Enums/StatusSolicitacao.cs` — `SOLICITADA`, `APROVADA`, `REJEITADA`.
- [ ] 2.5 Criar `3-Domain/Cadastro.Domain/Entities/CredencialTitular.cs` — campos: `Id`, `TitularId` (FK), `SenhaHash` (string), `TentativasFalhas` (int, default 0), `BloqueadoAte` (DateTime?), `CriadoEm`/`AtualizadoEm`. Métodos de domínio: `Criar(Guid titularId, string senhaHash)`, `VerificarSenhaEIncrementarFalha(string senha, string senhaHashAtual)` / `IncrementarFalha()` (5ª falha → `BloqueadoAte = now + 1min`; depois 5min, 15min — lockout exponencial), `ResetarFalhas()`, `EstaBloqueado` (computed). Lança `DomainException` em transições inválidas.
- [ ] 2.6 Criar `3-Domain/Cadastro.Domain/Entities/Ocorrencia.cs` — state machine `ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA`. Campos conforme Tech Spec. Métodos: `Criar(...)`, `AssumirAnalise()` (só de `ABERTA`), `Resolver(string parecer)` (só de `EM_ANALISE`), `Cancelar(string justificativa)` (de `ABERTA` ou `EM_ANALISE`). Transições inválidas lançam `DomainException` (RF-37).
- [ ] 2.7 Criar `3-Domain/Cadastro.Domain/Entities/SolicitacaoAlteracao.cs` — state machine `SOLICITADA → APROVADA | REJEITADA`. Campos conforme Tech Spec. Métodos: `Criar(...)` (**RF-20:** se `Campo == ASSOCIACAO`, `ValorPretendido` não pode ser vazio → `DomainException`), `Aprovar(Guid decisaoPor)`, `Rejeitar(Guid decisaoPor, string justificativa)`.
- [ ] 2.8 Estender `3-Domain/Cadastro.Domain/Entities/Titular.cs` — adicionar propriedades `Email? Email`, `Endereco? Endereco`, `IReadOnlyList<TelefoneTitular> Telefones` (cap 5). Método `AtualizarContato(Email? email, Endereco? endereco, IReadOnlyList<TelefoneTitular> telefones)` que substitui a coleção inteira, valida cap 5 (>5 → `DomainException`) e atualiza `AtualizadoEm`. Manter private setters.
- [ ] 2.9 Criar interfaces de repositório em `3-Domain/Cadastro.Domain/Interfaces/`:
  - `ICredencialTitularRepository.cs` — `ByTitularIdAsync`, `ByDocumentoAsync`, `AddAsync`, `SaveChangesAsync`
  - `IOcorrenciaRepository.cs` — `ListarAsync(OcorrenciaFiltro, ct) → (IEnumerable, int)`, `GetByIdAsync`, `AddAsync`, `Update`, `SaveChangesAsync`
  - `ISolicitacaoAlteracaoRepository.cs` — mesmo molde
  - Criar `OcorrenciaFiltro.cs` (Page, Size, Status?, TitularId?, Tipo?) e `SolicitacaoFiltro.cs` ao lado das interfaces (espelhar `TitularFiltro.cs`).
- [ ] 2.10 Adicionar constantes a `4-Infra/Cadastro.Infra/Events/EventTypes.cs`: `TitularContatoAtualizado = "cadastro.titular.contato.atualizado"`, `OcorrenciaAberta = "cadastro.ocorrencia.aberta"`, `OcorrenciaResolvida = "cadastro.ocorrencia.resolvida"`.
- [ ] 2.11 Testes unitários em `5-Tests/Cadastro.UnitTests/`:
  - `Entities/CredencialTitularTests.cs` — `Criar` gera Id; `IncrementarFalha` bloqueia na 5ª; `ResetarFalhas` zera e limpa bloqueio.
  - `Entities/OcorrenciaTests.cs` — `ABERTA→EM_ANALISE` ok; `EM_ANALISE→RESOLVIDA` ok; `RESOLVIDA→ABERTA` → `DomainException`; `Cancelar` de `RESOLVIDA` → `DomainException`.
  - `Entities/SolicitacaoAlteracaoTests.cs` — `Criar` com `ASSOCIACAO` vazio → `DomainException` (RF-20); `Aprovar`/`Rejeitar` transitam; `Aprovar` de `APROVADA` → `DomainException`.
  - `Titulares/TitularAtualizarContatoTests.cs` — substitui coleção; >5 telefones → `DomainException`.

## Sequenciamento

- Bloqueado por: 1.0 (depende dos VOs Email, Endereco, TelefoneTitular)
- Desbloqueia: 3.0
- Paralelizável: Não (depende dos VOs da 1.0; é o núcleo do domínio)

## Detalhes de Implementação

**Padrão de entidade** (de `Entities/Titular.cs`): private setters, construtor privado para EF, factory `Criar` estático com `Id = Guid.NewGuid()`, `CriadoEm/AtualizadoEm = DateTime.UtcNow`.

**State machine de Ocorrencia** — transições válidas:

```
ABERTA ──AssumirAnalise──▶ EM_ANALISE
EM_ANALISE ──Resolver──▶ RESOLVIDA
ABERTA|EM_ANALISE ──Cancelar──▶ CANCELADA
```

Qualquer outra transição lança `DomainException($"Transição inválida: {Status} → {novoStatus}")`.

**Lockout exponencial** (`CredencialTitular`): a cada `IncrementarFalha()`, `TentativasFalhas++`. Quando atinge múltiplos de 5, `BloqueadoAte = now + (ciclo × duração)` onde duração cresce: 1ª vez 1min, 2ª vez 5min, 3ª vez 15min. `EstaBloqueado => BloqueadoAte.HasValue && BloqueadoAte > DateTime.UtcNow`. O reset ocorre em login bem-sucedido.

**RF-20 (proibição de remoção de associação):** validado em `SolicitacaoAlteracao.Criar` — se `Campo == CampoSolicitacao.ASSOCIACAO` e `string.IsNullOrWhiteSpace(ValorPretendido)`, lançar `DomainException("O vínculo de associação só pode ser alterado, nunca removido")`.

## Critérios de Sucesso

- As 3 entidades compilam com state machines que rejeitam transições inválidas via `DomainException`.
- `Titular.AtualizarContato` substitui a coleção de telefones e impõe o cap de 5.
- RF-20 enforced no domínio (associação nunca removida).
- `EventTypes.cs` contém as 3 novas constantes.
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
