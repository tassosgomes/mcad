---
status: pending
parallelizable: false
blocked_by: ["2.0", "3.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Application — Commands Especiais (ObterIswc, Depurar, AlterarDominioPublico)

## Relacionada às User Stories

- [HU-02] Obter ISWC, [HU-05] Domínio Público, depuração (HU-04 implícito)

## Visão Geral

Criar os 3 commands com lógica de negócio complexa: ObterIswc (chama API externa, valida pré-requisitos, verifica unicidade), Depurar (transacional: depura original + cria nova), AlterarDominioPublico (toggle flag + status).

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Obras/Commands/ObterIswcCommand.cs` + Handler
  - `2-Application/.../Obras/Commands/DepurarObraCommand.cs` + Handler
  - `2-Application/.../Obras/Commands/AlterarDominioPublicoCommand.cs` + Handler
- **Referência:**
  - `tasks/prd-gestao-obras/techspec.md` (seções "Fluxo de Dados — Obter ISWC" e "Depuração")
- **Skills:** `dotnet-architecture` — Commands complexos, transações

## Subtarefas

- [ ] 6.1 `ObterIswcCommand(Guid ObraId)` + Handler: valida status==PENDENTE, valida tem titulares autorais (via repo de titularidades — inicialmente placeholder), seleciona associação (titular maior %), chama IIswcService, verifica ExisteIswcAsync, obra.AtribuirIswc, save
- [ ] 6.2 `DepurarObraCommand(Guid ObraId, string Titulo, TipoObra Tipo, string? Subtitulo, string? Genero)` + Handler: valida status==LIBERADO, obra.Depurar(novaObraId), ObraMusical.Criar com dados novos, AddAsync(novaObra), SaveChangesAsync (transacional — ambas na mesma operação), retorna DepuracaoResponse
- [ ] 6.3 `AlterarDominioPublicoCommand(Guid ObraId, bool DominioPublico)` + Handler: obra.MarcarDominioPublico(valor), save
- [ ] 6.4 Verificar build: `dotnet build`

## Detalhes de Implementação

### ObterIswcCommandHandler — seleção da associação
```csharp
// Obter titulares autorais da obra (via repo titularidades — placeholder para F04)
// Selecionar titular com maior percentual
// Em caso de empate, o primeiro
// Usar sigla da associação desse titular
var associacaoSigla = ...; // placeholder até F04
var autores = ...; // nomes dos titulares
var iswc = await _iswcService.ObterIswcAsync(obra.Titulo, autores, associacaoSigla, ct);
```

> **Nota:** Até F04, o endpoint de ISWC pode retornar 422 "sem titulares". Quando F04 for implementado, a query de titularidades será conectada.

### DepurarObraCommandHandler — transacional
```csharp
var novaObra = ObraMusical.Criar(cmd.Titulo, cmd.Tipo, cmd.Subtitulo, cmd.Genero);
obraOriginal.Depurar(novaObra.Id);
await _repo.AddAsync(novaObra, ct);
await _repo.SaveChangesAsync(ct); // ambas persistidas na mesma transação
return new DepuracaoResponse(MapToResponse(obraOriginal), MapToResponse(novaObra));
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] ObterIswc: obra PENDENTE + titulares → ISWC salvo
- [ ] ObterIswc: sem titulares → 422
- [ ] ObterIswc: API falha → ExternalServiceException (502)
- [ ] ObterIswc: ISWC duplicado → ConflictException (409)
- [ ] Depurar: obra LIBERADA → original DEPURADA + nova PENDENTE (mesma transação)
- [ ] Depurar: obra PENDENTE → DomainException
- [ ] AlterarDP: true → status DOMINIO_PUBLICO; false → retorna status anterior
