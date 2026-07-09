# Especificação Técnica — Cadastro Unificado de Repertório

## Resumo Executivo

A funcionalidade será implementada como um caso de uso composto do bounded context **Cadastro**, sem criar entidade, agregado, tabela ou read model chamados *Repertório*. A API .NET exporá uma operação própria, protegida exclusivamente por `cadastro:default:repertorio:criar`, que recebe a jornada inteira, resolve titulares existentes ou novos, calcula participações conexas, solicita o ISWC e persiste os artefatos já existentes em uma única transação PostgreSQL.

A chamada ao ISWC ocorre somente após a validação completa do payload e antes de abrir a transação local. Com ISWC, a Obra é criada já `LIBERADO`; cada Fonograma recebe suas participações calculadas e é liberado automaticamente quando também possuir URL de áudio — pré-requisito vigente que deve ser tornado obrigatório no wizard. Sem ISWC, a UI conserva somente o estado em memória e oferece nova tentativa ou uma segunda operação explícita para gravar o conjunto íntegro com a Obra `PENDENTE`; nesse caso os Fonogramas permanecem no estado atual compatível (`PENDENTE_DOCUMENTACAO`).

## Skills de Referência

| Skill | Caminho | Decisões Influenciadas |
|-------|---------|------------------------|
| `dotnet-architecture` | `/home/tsgomes/.agents/skills/csharp/dotnet-architecture/SKILL.md` | Clean Architecture, CQRS nativo, interfaces no Domain e handler composto. |
| `dotnet-dependency-config` | `/home/tsgomes/.agents/skills/csharp/dotnet-dependency-config/SKILL.md` | EF Core/PostgreSQL, transação explícita e Outbox existente; nenhuma dependência nova. |
| `dotnet-code-quality` | `/home/tsgomes/.agents/skills/csharp/dotnet-code-quality/SKILL.md` | Records imutáveis, `CancellationToken`, nomes e responsabilidades pequenas. |
| `dotnet-testing` | `/home/tsgomes/.agents/skills/csharp/dotnet-testing/SKILL.md` | xUnit + AwesomeAssertions/Moq e integração via `WebApplicationFactory` + PostgreSQL Testcontainers. |
| `common/restful-api` | `/home/tsgomes/.agents/skills/common/restful-api/SKILL.md` | Versionamento `/api/v1`, `ProblemDetails`, `201`, `422`, `409` e contrato OpenAPI. |

## Arquitetura do Sistema

### Visão Geral dos Componentes

O frontend React adiciona a rota `/cadastro/repertorios/novo`, acessível pela ação **Novo Repertório** na listagem de Obras e exibida apenas para quem possuir a nova permissão. Um reducer local mantém as quatro etapas do wizard: dados da Obra; titulares/titularidades; Fonogramas/participações; revisão. Nenhuma etapa chama mutações das APIs legadas. A busca exata por CPF/CNPJ usa uma query dedicada da nova operação e devolve apenas dados de seleção compatíveis com LGPD; a validação definitiva continua no backend.

No backend, `RegistrarRepertorioCommandHandler` é o único orquestrador. Ele reutiliza as entidades `Titular`, `ObraMusical`, `TitularidadeAutoral`, `Fonograma` e `ParticipacaoConexa`, os value objects de CPF/CNPJ/CAE-IPI/ISRC, `CalculadoraConexos`, os validadores de liberação, repositórios, publishers de auditoria e a Outbox. Ele não despacha os handlers CRUD existentes, pois eles fazem `SaveChangesAsync` individualmente e quebrariam a atomicidade.

Fluxo de sucesso: validar o comando e as relações entre seus itens; consultar titulares e associações já existentes; normalizar e rejeitar duplicidades de documento/ISRC/papel; obter ISWC; abrir transação; adicionar todas as entidades e auditorias/outbox ao mesmo `CadastroDbContext`; calcular participações; liberar Obra e Fonogramas elegíveis; salvar uma vez e confirmar a transação. Qualquer erro antes de `CommitAsync` resulta em rollback integral.

### Interfaces Principais

```csharp
public interface ICadastroUnitOfWork
{
    Task<ICadastroTransaction> BeginTransactionAsync(CancellationToken cancellationToken);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

public interface ICadastroTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken);
    Task RollbackAsync(CancellationToken cancellationToken);
}
```

`ICadastroUnitOfWork` fica em `Cadastro.Domain.Interfaces` e sua implementação EF Core fica em Infra. Todos os repositórios e writers já compartilham o DbContext scoped; portanto, `AddAsync`, auditoria e `_outbox.AddEvent` apenas acumulam mudanças. O handler é responsável por uma única chamada de `SaveChangesAsync` e pelo commit. Não criar `IUnitOfWork` genérico nem mover o DbContext para Application.

```csharp
public record RegistrarRepertorioCommand(
    DadosObraRepertorio Obra,
    IReadOnlyCollection<TitularRepertorioInput> Titulares,
    IReadOnlyCollection<TitularidadeRepertorioInput> Titularidades,
    IReadOnlyCollection<FonogramaRepertorioInput> Fonogramas,
    bool SalvarComoPendente) : ICommand<CadastroRepertorioResponse>;
```

Cada referência de titular contém exatamente um de `TitularId` (existente) ou `NovoTitular` (nome, PF/PJ, documento, nacionalidade, associação e CAE/IPI). Titularidades e participações referenciam uma chave local de titular, para permitir que o mesmo novo titular seja usado em vários papéis. Cada Fonograma contém ISRC, país, datas, **`urlAudio`**, e suas participações. `SalvarComoPendente=false` exige ISWC; `true` é permitido somente pela escolha apresentada após uma resposta de indisponibilidade na mesma sessão de UI e não chama o ISWC.

### Modelos de Dados

Não há migration: o schema `cadastro` e as entidades persistidas existentes são suficientes. A nova camada de transporte usa records de input/response; eles não são entidades EF.

| Modelo | Uso |
|--------|-----|
| `DadosObraRepertorio` | Título, subtítulo, tipo e gênero; alimenta `ObraMusical.Criar`. |
| `TitularRepertorioInput` / `NovoTitularRepertorioInput` | Reuso ou criação de `Titular`; documento é normalizado pelos value objects e verificado contra banco e payload. |
| `TitularidadeRepertorioInput` | Chave local do titular, `AUTOR`/`EDITOR`, percentual decimal com quatro casas. |
| `FonogramaRepertorioInput` | ISRC, país, datas, URL de áudio e participações. |
| `ParticipacaoRepertorioInput` | Chave local do titular e `INTERPRETE`, `PRODUTOR_FONOGRAFICO` ou `MUSICO_EXECUTANTE`. |
| `CadastroRepertorioResponse` | Obra, Fonogramas, titulares novos criados, `iswcObtido` e links de detalhe. |

Todas as porcentagens usam `decimal`; nunca `float`/`double`. O handler aplica as regras existentes antes de persistir: RN-01 (titularidades = 100%), RN-03/RN-09 (Produtor e Intérprete por Fonograma), RN-04/RN-12/RN-13/RN-15 (`CalculadoraConexos` e arredondamento), RN-07 (papéis independentes) e RN-11 (Editor apenas PJ). Também bloqueia duplicata de titular/categoria na mesma Obra ou Fonograma e duplicata de ISRC/documento tanto no payload quanto no banco.

### Endpoints de API

| Método e caminho | Descrição | Respostas |
|---|---|---|
| `GET /api/v1/repertorios/titulares?documento=` | Busca exata de titular por CPF/CNPJ durante o wizard; não cria dados. | `200` com zero ou um resumo mascarado; `400` para documento inválido. |
| `POST /api/v1/repertorios` | Valida, solicita ISWC e persiste o cadastro íntegro. | `201` com `CadastroRepertorioResponse`; `400` sintaxe; `409` documento/ISRC/vínculo duplicado; `422` regras de negócio; `502` ISWC indisponível, sem persistência. |
| `POST /api/v1/repertorios/pendentes` | Persiste a mesma jornada sem solicitar ISWC depois de a UI registrar uma falha de ISWC. | `201` com Obra `PENDENTE`; mesmos erros locais acima. |

Os três endpoints requerem `CadastroPermissions.RepertorioCriar`. `POST` retorna `Location: /api/v1/obras/{obraId}`. A exceção específica de indisponibilidade de ISWC acrescenta `code: "ISWC_INDISPONIVEL"` ao `ProblemDetails` de `502`, permitindo que a UI mostre somente **Tentar novamente** e **Salvar como pendente** sem perder seu estado local. Não expor tentativas anteriores, documentos completos ou payloads no erro/log.

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommand.cs` | Contrato | Inputs imutáveis do comando composto e modos ISWC/pendente. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommandValidator.cs` | Validador | Estrutura, exclusividade de titular, coleções obrigatórias, campos e limites. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Commands/RegistrarRepertorioCommandHandler.cs` | Handler | Orquestra validação, ISWC, transação, entidades, eventos e auditoria. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Queries/BuscarTitularPorDocumentoQuery.cs` | Query | Lookup exato seguro para o wizard. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Queries/BuscarTitularPorDocumentoQueryHandler.cs` | Handler de query | Normaliza documento e retorna resumo mascarado. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/Responses/CadastroRepertorioResponse.cs` | DTO | Resultado composto e links de consulta. |
| `services/cadastro-api/2-Application/Cadastro.Application/Repertorios/RepertorioIswcIndisponivelException.cs` | Exceção | Sinaliza `ISWC_INDISPONIVEL` sem persistência local. |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/ICadastroUnitOfWork.cs` | Interface | Abstração transacional da camada interna. |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroUnitOfWork.cs` | Infra | Implementação EF Core de transação e `SaveChanges`. |
| `services/cadastro-api/1-Services/Cadastro.API/Endpoints/RepertorioEndpoints.cs` | Rota | Endpoints REST compostos e mapeamento HTTP. |
| `services/cadastro-api/5-Tests/Cadastro.UnitTests/Repertorios/RegistrarRepertorioCommandHandlerTests.cs` | Teste unitário | Regras, cálculos, novos/existentes, estados e rollback simulado. |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/RepertorioEndpointsTests.cs` | Teste integração | Autorização, respostas e persistência/rollback real no PostgreSQL. |
| `frontend/src/features/cadastro/repertorio/types/repertorio.ts` | Tipos | Estado do wizard, DTOs e resposta. |
| `frontend/src/features/cadastro/repertorio/api/repertorioApi.ts` | Cliente API | Lookup e as duas mutações compostas. |
| `frontend/src/features/cadastro/repertorio/hooks/useCadastroRepertorio.ts` | Hook | Mutations, invalidação de queries e tratamento de falha ISWC. |
| `frontend/src/features/cadastro/repertorio/components/RepertorioWizard.tsx` | Componente | Indicador, reducer, avanço/retorno e validação de etapa. |
| `frontend/src/features/cadastro/repertorio/components/TitularRepertorioSelector.tsx` | Componente | Busca por documento, seleção e formulário de novo titular. |
| `frontend/src/features/cadastro/repertorio/components/FonogramasRepertorioStep.tsx` | Componente | Fonogramas, URL de áudio e participações. |
| `frontend/src/features/cadastro/repertorio/components/RevisaoRepertorioStep.tsx` | Componente | Totais, pendências, resultado e escolhas após ISWC. |
| `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.tsx` | Página | Nova rota do wizard. |
| `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.module.css` | Estilo | Layout responsivo, etapas e resumo. |
| `frontend/src/features/cadastro/repertorio/__tests__/CadastroRepertorioPage.test.tsx` | Teste frontend | Etapas, pendências, retry e salvar pendente. |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Registrar `ICadastroUnitOfWork` e mapear endpoints de Repertório. |
| `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` | Adicionar constante `RepertorioCriar`. |
| `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` | Serializar código seguro para a indisponibilidade específica de ISWC. |
| `seeds/mcad/cadastro.permissions.json` | Versionar a nova permissão e sua descrição. |
| `seeds/mcad/roles.json` | Atribuir a nova permissão a `cadastro.default.analista`, nunca ao consultor. |
| `frontend/src/features/cadastro/index.tsx` | Registrar a rota `repertorios/novo`. |
| `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` | Incluir ação **Novo Repertório**, gated pela nova permissão. |
| `contracts/cadastro/openapi.json` | Contrato gerado após exportação; incluir os endpoints e schemas novos. |
| `docs/architecture/service-communication.md` | Documentar rota, permissão e semântica transacional do endpoint composto. |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` | Factory e transição ISWC/LIBERADO. |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs` | Estados e transições de Fonograma. |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs` | Cálculo e arredondamento oficial. |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs` | Pré-requisitos de Obra. |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoFonograma.cs` | Pré-requisitos incluindo URL de áudio e Obra liberada. |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs` | Escrita transacional de CloudEvents existentes. |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` | Fixture PostgreSQL, authz e mocks de ISWC. |

## Pontos de Integração

`IIswcService` é a única chamada externa. O handler usa o cliente já registrado, propaga `CancellationToken` e não inclui a chamada na transação local. Respostas não exitosas, timeout e falha de rede tornam-se `502 / ISWC_INDISPONIVEL`; não há retry automático, idempotência, compensação nem dado local persistido. O retry é uma nova solicitação explícita da UI com o mesmo estado em memória.

Em sucesso, reutilizar eventos existentes: `cadastro.titular.criado` para cada novo Titular, `cadastro.obra.liberada` quando houver ISWC e `cadastro.fonograma.liberado` para cada Fonograma que cumprir todos os pré-requisitos. Eventos e audit outbox são gravados na mesma transação do conjunto; nenhum tipo novo de evento é necessário. Com gravação pendente não publicar eventos de liberação.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
|---|---|---|---|
| Cadastro API/schema | Novo caso de uso, sem migration | Alto valor; erro de orquestração pode causar persistência parcial. | Transaction abstraction, integração de rollback e constraints existentes. |
| ISWC API | Chamada síncrona externa | Médio: timeout pode ter emitido ISWC remotamente apesar do erro local. | Expor retry manual; alinhar capacidade de distinguir/emparelhar emissões. |
| Authz | Novo catálogo/role | Médio: ausência de seed bloqueia analista. | Atualizar seed e validar `403` para consultor. |
| Frontend Cadastro | Novo wizard | Médio: formulário extenso e regras cruzadas. | Estado local tipado, validação por etapa e revisão navegável. |
| Identificação/Distribuição/Analytics | Eventos e dados já contratados | Baixo: não há contrato novo; passam a receber entidades liberadas já existentes. | Não alterar consumidores; executar Contract Gate. |

## Abordagem de Testes

### Testes Unitários

Cobrir o handler com repositórios, UoW, ISWC e publishers mockados: titular existente versus novo; documento repetido no payload/banco; soma autoral diferente de 100%; Editor PF; ISRC repetido; ausência de Intérprete/Produtor; rateio e arredondamento RN-12; dois Fonogramas; caminho com ISWC que libera Obra e Fonogramas com URL; caminho pendente que não chama ISWC e não libera Fonogramas; falha de ISWC sem iniciar persistência; e exceção ao inserir o segundo Fonograma que chama rollback. Nomes seguem `Metodo_Condicao_ComportamentoEsperado` e todos os fluxos recebem `CancellationToken`.

### Testes de Integração

Com `CadastroApiFactory`, mockar `IIswcService` e usar PostgreSQL real. Verificar `201`, resposta/`Location`, todas as tabelas e audit/outbox após sucesso; contagens zeradas após ISRC duplicado no segundo Fonograma; `502` e contagens zeradas após indisponibilidade; `POST /pendentes` com Obra PENDENTE e Fonogramas PENDENTE_DOCUMENTACAO; `403` sem `RepertorioCriar`; e `GET` por documento retornando resumo permitido. Executar também `npm run test`, testes de componente e `npm run build` no frontend.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. Adicionar permissão/seed/role, interface de UoW e registro DI.
2. Criar contratos, validador, query de lookup e handler transacional com testes unitários.
3. Mapear endpoints, `ProblemDetails`, testes de integração e exportar OpenAPI.
4. Construir tipos/API/hooks frontend, depois wizard e ação em Obras.
5. Executar testes, build, Contract Gate e revisão manual dos caminhos ISWC.

### Dependências Técnicas

É necessário PostgreSQL acessível para as integrações e ambiente/mock do ISWC para os testes. Não há migration nem serviço novo. Antes do commit de mudança de API, subir os serviços e executar `scripts/export-contracts.sh`; versionar somente o contrato gerado alterado.

## Monitoramento e Observabilidade

Usar os logs estruturados existentes com `obra.titulo` somente quando não sensível, quantidade de titulares/fonogramas, resultado (`liberado` ou `pendente`), código do erro ISWC e IDs gerados após sucesso. Nunca registrar CPF/CNPJ, CAE/IPI nem payload completo. Emitir métricas de contador para `cadastro_repertorio_confirmacoes_total{resultado}` e `cadastro_repertorio_iswc_falhas_total`, e histograma da duração da chamada ISWC. A audit outbox preserva autor, ação e alterações das entidades criadas.

## Considerações Técnicas

### Decisões Principais

- **Endpoint composto, não composição de chamadas CRUD:** garante uma validação e um commit local únicos.
- **Sem agregado Repertório e sem tabela:** respeita a fonte de verdade das entidades existentes e o não-objetivo do PRD.
- **ISWC antes da transação:** limita a transação a recursos locais e evita dados parciais em falha externa.
- **URL de áudio obrigatória no wizard:** é o pré-requisito vigente que faltava para liberar Fonogramas. Com ISWC, Obra liberada, participações calculadas e URL válida, o fluxo os libera automaticamente; sem URL, a validação bloqueia a confirmação como repertório pronto.
- **UoW específico de Cadastro:** mantém Application independente de EF Core e permite um commit real compartilhado por todos os repositórios, outbox e auditoria.

### Riscos Conhecidos

- Uma falha de rede pode ocultar uma emissão remota de ISWC; como idempotência está fora de escopo, a repetição manual pode duplicar a solicitação externa. O serviço ISWC deve informar se dispõe de consulta/correlation seguro antes de produção.
- Verificações de unicidade antes do commit têm janela de concorrência; índices únicos já existentes são a proteção final. O handler deve traduzir violações de índice conhecidas para `409` sem deixar resíduos.
- O wizard mantém dados sensíveis apenas em memória; atualização/fechamento de aba descarta a jornada conforme o não-objetivo de rascunhos.

### Requisitos Especiais

Não adicionar retries automáticos para ISWC. Consultor continua somente leitura: a permissão nova não é incluída no role consultor e a API, não apenas a UI, a exige. Não há impacto de schema cross-service; Identificação e Distribuição consomem as entidades/eventos de Cadastro já publicados.

### Conformidade com Padrões

A solução segue as camadas numeradas, CQRS nativo, FluentValidation, interfaces de infraestrutura no Domain, Minimal APIs, `ProblemDetails`, PostgreSQL schema-per-service, Outbox + CloudEvents, auditoria existente e xUnit/Testcontainers. O único desvio deliberado é expor `repertorios` como recurso transitório de API; ele representa uma operação de jornada e não uma entidade persistida, evitando a alternativa explicitamente descartada no PRD.
