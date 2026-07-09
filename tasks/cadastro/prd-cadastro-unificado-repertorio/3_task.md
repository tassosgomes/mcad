---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database, external_apis</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Implementar o handler atômico de registro e os testes unitários

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (direta)
- [HU-02] Reutilizar titular existente (direta)
- [HU-03] Corrigir erros antes de gravar (direta)

## Requisitos

- RF-04, RF-06–RF-14 e RF-16–RF-23: regra de domínio, ISWC, persistência atômica, eventos e auditoria.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommandHandler.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Repertorios/RegistrarRepertorioCommandHandlerTests.cs`
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoFonograma.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs`
- **Skills:** dotnet-architecture, dotnet-code-quality, dotnet-testing, dotnet-observability, dotnet-production-readiness.

## Subtarefas

- [ ] 3.1 Validar todo o comando e resolver titulares/associações existentes antes da transação; normalizar e rejeitar documentos, ISRCs e pares titular/categoria duplicados no payload e no banco.
- [ ] 3.2 Com `SalvarComoPendente=false`, solicitar ISWC antes de abrir a transação; mapear timeout/rede/resposta não exitosa para `RepertorioIswcIndisponivelException`, sem retry automático e sem persistência.
- [ ] 3.3 Abrir uma transação local, criar todos os Titulares novos, Obra, titularidades, Fonogramas e participações; chamar `SaveChangesAsync` uma única vez e confirmar somente depois.
- [ ] 3.4 Aplicar RN-01, RN-03/RN-09, RN-04/RN-12/RN-13/RN-15, RN-07 e RN-11; usar `CalculadoraConexos` oficial.
- [ ] 3.5 No caminho com ISWC, liberar Obra e Fonogramas elegíveis com URL; no pendente, não chamar ISWC, manter Obra `PENDENTE`, Fonogramas `PENDENTE_DOCUMENTACAO` e não publicar liberação.
- [ ] 3.6 Gravar auditorias/outbox existentes no mesmo contexto; publicar somente os tipos já existentes e nunca criar evento `repertorio.*`.
- [ ] 3.7 Cobrir todos os caminhos na suíte unitária, inclusive rollback ao falhar o segundo Fonograma.

## Sequenciamento

- Bloqueado por: 1.0 e 2.0.
- Desbloqueia: 4.0.
- Paralelizável: Não — centraliza a semântica transacional.

## Rastreabilidade

- Esta tarefa cobre: RF-04, RF-06–RF-14 e RF-16–RF-23.
- Evidência esperada: suíte unitária cobrindo sucesso, pendência, indisponibilidade e rollback.

## Detalhes de Implementação

O handler é o único orquestrador; não deve despachar handlers CRUD legados, pois eles persistem individualmente. Em falha após iniciar a transação, executar rollback e não deixar entidades, audit outbox ou eventos. Converter violações conhecidas de índice único para conflito, sem resíduos.

Adicionar logs estruturados com resultado, quantidades e IDs somente após sucesso; criar `cadastro_repertorio_confirmacoes_total{resultado}`, `cadastro_repertorio_iswc_falhas_total` e histograma da duração ISWC na infraestrutura de métricas já existente. Não registrar CPF/CNPJ, CAE/IPI ou payload.

**Convenções da stack:** `CancellationToken` em toda cadeia async; exceções específicas; Activity/log scope correlacionável; testes AAA com mocks e `CancellationToken`; não cancelar depois do commit/efeitos persistentes.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --filter 'FullyQualifiedName~RegistrarRepertorioCommandHandlerTests'` passa.
- [ ] A suíte prova: soma autoral ≠100, Editor PF, ISRC/documento duplicado, ausência de intérprete/produtor e rateio/arredondamento.
- [ ] A suíte prova: ISWC indisponível não inicia persistência; pendente não chama ISWC; falha do segundo Fonograma chama rollback e não confirma.
- [ ] Há uma única chamada a `SaveChangesAsync` no caminho de confirmação e nenhum handler CRUD legado é despachado.
