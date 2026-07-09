---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0, 4.0, 5.0"</unblocks>
</task_context>

# Tarefa 2.0: Criar contratos, busca de titular e validação do caso de uso

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (direta)
- [HU-02] Reutilizar titular existente (direta)
- [HU-03] Corrigir erros antes de gravar (direta)

## Requisitos

- RF-04 a RF-09, RF-11, RF-12 e RF-14: contratos, lookup e validação anterior à persistência.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommand.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommandValidator.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Queries/BuscarTitularPorDocumentoQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Queries/BuscarTitularPorDocumentoQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Responses/CadastroRepertorioResponse.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/RepertorioIswcIndisponivelException.cs`
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Titular.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/`
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/`
- **Skills:** dotnet-architecture, dotnet-code-quality, dotnet-testing, common/restful-api.

## Subtarefas

- [ ] 2.1 Modelar records imutáveis de Obra, titular novo/existente, titularidade, Fonograma (incluindo `urlAudio`) e participação; uma referência contém exatamente `TitularId` ou `NovoTitular`.
- [ ] 2.2 Modelar resposta com Obra, Fonogramas, titulares criados, `iswcObtido` e links de detalhe.
- [ ] 2.3 Criar FluentValidation para estrutura, coleções obrigatórias, documentos/ISRC e exclusividade da referência de titular.
- [ ] 2.4 Criar query de busca exata que normaliza CPF/CNPJ e devolve zero/um resumo mascarado, sem criação de dados.
- [ ] 2.5 Definir a exceção de indisponibilidade de ISWC para posterior tradução segura em `502`.
- [ ] 2.6 Acrescentar testes unitários de validador/query onde a estrutura de testes existente permitir.

## Sequenciamento

- Bloqueado por: 1.0.
- Desbloqueia: 3.0, 4.0 e 5.0.
- Paralelizável: Não — estabelece o contrato consumido por handler, endpoints e frontend.

## Rastreabilidade

- Esta tarefa cobre: RF-04–RF-09, RF-11, RF-12 e RF-14.
- Evidência esperada: records/validador/query e testes de cenários inválidos.

## Detalhes de Implementação

Use `decimal`, nunca `float`/`double`. O validador antecipa estrutura; o handler fará as verificações dependentes do banco e as regras de domínio. Prever os erros de regras como `422` e duplicidades como `409`, sem vazar documento completo. A query não deve expor CPF/CNPJ, CAE/IPI nem payload sensível.

**Convenções da stack:** CQRS nativo (`ICommand<T>`/`IQuery<T>`), FluentValidation no handler, records e coleções `IReadOnlyCollection`, nomes de testes `Metodo_Condicao_ComportamentoEsperado`, AAA com xUnit/AwesomeAssertions/Moq.

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --filter 'FullyQualifiedName~Repertorios'` passa.
- [ ] O comando não aceita referência com `TitularId` e `NovoTitular` simultaneamente nem sem ambos.
- [ ] O contrato inclui `urlAudio`, coleções de Fonogramas/participações e `SalvarComoPendente`.
- [ ] A busca por documento inválido pode ser mapeada para `400` sem revelar o documento informado.
