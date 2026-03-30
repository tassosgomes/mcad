---
status: done
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Application — Commands (Criar, Atualizar, Excluir) + Validators

## Relacionada às User Stories

- [HU-01] Cadastrar PF, [HU-02] Cadastrar PJ, [HU-04] Editar

## Visão Geral

Criar Commands CQRS para as 3 operações de escrita, seus Handlers com lógica de negócio (validação de VO, unicidade, vínculos) e Validators FluentValidation para validação de shape do request.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommand.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommandHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommandValidator.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommand.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommandHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommandValidator.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/ExcluirTitularCommand.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands/ExcluirTitularCommandHandler.cs`
- **Referência:**
  - `tasks/prd-gestao-titulares/techspec.md` (seção "Commands CQRS")
- **Skills:** `dotnet-architecture` — CQRS Commands; `dotnet-code-quality` — FluentValidation

## Subtarefas

- [ ] 6.1 Criar `CriarTitularCommand` record + Validator (nome obrigatório, tipo PF/PJ, documento, nacionalidade, associacaoId)
- [ ] 6.2 Criar `CriarTitularCommandHandler` — valida VO (Cpf ou Cnpj conforme tipo), verifica unicidade (ExisteDocumentoAsync), verifica FK associação, cria entidade via factory
- [ ] 6.3 Criar `AtualizarTitularCommand` record + Validator
- [ ] 6.4 Criar `AtualizarTitularCommandHandler` — busca entidade, chama Atualizar(), salva
- [ ] 6.5 Criar `ExcluirTitularCommand` record + Handler — verifica PossuiVinculosAsync, ConflictException se sim
- [ ] 6.6 Instalar FluentValidation se necessário: `dotnet add package FluentValidation.DependencyInjectionExtensions`
- [ ] 6.7 Verificar build: `dotnet build`

## Detalhes de Implementação

### CriarTitularCommandHandler (lógica central)
```csharp
public async Task<TitularResponse> HandleAsync(CriarTitularCommand cmd, CancellationToken ct)
{
    // 1. Validar FluentValidation (shape)
    await _validator.ValidateAndThrowAsync(cmd, ct);

    // 2. Criar VO conforme tipo
    var tipo = Enum.Parse<TipoTitular>(cmd.Tipo);
    Cpf? cpf = tipo == TipoTitular.PF ? Cpf.Create(cmd.Documento) : null;
    Cnpj? cnpj = tipo == TipoTitular.PJ ? Cnpj.Create(cmd.Documento) : null;
    var documento = cpf?.Valor ?? cnpj!.Valor;

    // 3. Verificar unicidade
    if (await _titularRepo.ExisteDocumentoAsync(documento, ct))
        throw new ConflictException($"Já existe um titular com este documento");

    // 4. Verificar associação existe
    var associacao = await _associacaoRepo.GetByIdAsync(cmd.AssociacaoId, ct)
        ?? throw new NotFoundException(nameof(Associacao), cmd.AssociacaoId);

    // 5. Criar entidade
    var caeIpi = cmd.CaeIpi != null ? CaeIpi.Create(cmd.CaeIpi) : null;
    var titular = tipo == TipoTitular.PF
        ? Titular.CriarPessoaFisica(cmd.Nome, cpf!, cmd.Nacionalidade, cmd.AssociacaoId, caeIpi)
        : Titular.CriarPessoaJuridica(cmd.Nome, cnpj!, cmd.Nacionalidade, cmd.AssociacaoId, caeIpi);

    // 6. Persistir
    await _titularRepo.AddAsync(titular, ct);
    await _titularRepo.SaveChangesAsync(ct);

    // 7. Mapear response
    return MapToResponse(titular, associacao);
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] CriarTitularCommandHandler cria PF com Cpf e PJ com Cnpj
- [ ] Handler rejeita documento duplicado com ConflictException
- [ ] Handler rejeita documento inválido com DomainException (via VO)
- [ ] ExcluirTitularCommandHandler verifica vínculos antes de excluir
