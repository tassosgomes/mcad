---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Application — Integrar IOutboxEventWriter nos 8 handlers existentes

## Visão Geral

Adicionar `IOutboxEventWriter` como dependência nos 8 handlers que disparam eventos e chamar `_outbox.AddEvent(...)` com o tipo e payload corretos antes do SaveChangesAsync.

## Arquivos Envolvidos

- **Modificar:**
  - `2-Application/.../Status/Commands/LiberarObraCommandHandler.cs` — +AddEvent(EventTypes.ObraLiberada, obraId, { obraId, titulo, iswc })
  - `2-Application/.../Status/Commands/BloquearObraCommandHandler.cs` — +AddEvent(EventTypes.ObraBloqueada, obraId, { obraId, titulo, justificativa })
  - `2-Application/.../Obras/Commands/AlterarDominioPublicoCommandHandler.cs` — +AddEvent(EventTypes.ObraDominioPublico, obraId, { obraId, titulo, dominioPublico })
  - `2-Application/.../Obras/Commands/DepurarObraCommandHandler.cs` — +AddEvent(EventTypes.ObraDepurada, obraId, { obraId, titulo, iswcOriginal, novaObraId })
  - `2-Application/.../Status/Commands/LiberarFonogramaCommandHandler.cs` — +AddEvent(EventTypes.FonogramaLiberado, fonogramaId, { fonogramaId, isrc, obraId })
  - `2-Application/.../Fonogramas/Commands/DepurarFonogramaCommandHandler.cs` — +AddEvent(EventTypes.FonogramaDepurado, fonogramaId, { fonogramaId, isrcOriginal, novoFonogramaId, obraId })
  - `2-Application/.../Status/Commands/BloquearFonogramaCommandHandler.cs` — +AddEvent(EventTypes.FonogramaBloqueado, fonogramaId, { fonogramaId, isrc, justificativa })
  - `2-Application/.../Titulares/Commands/CriarTitularCommandHandler.cs` — +AddEvent(EventTypes.TitularCriado, titularId, { titularId, nome, tipo, documento })

## Subtarefas

- [ ] 6.1 Adicionar `IOutboxEventWriter _outbox` ao construtor de cada handler (8 handlers)
- [ ] 6.2 Em cada handler, antes do `SaveChangesAsync`, adicionar `_outbox.AddEvent(EventTypes.XXX, entityId.ToString(), new { ... })`
- [ ] 6.3 Verificar que o AddEvent é chamado ANTES do SaveChanges (mesma transação)
- [ ] 6.4 `dotnet build`

## Detalhes de Implementação

Padrão para cada handler:
```csharp
// Adicionar ao construtor:
private readonly IOutboxEventWriter _outbox;

// Antes do SaveChangesAsync:
_outbox.AddEvent(EventTypes.ObraLiberada, obra.Id.ToString(), new
{
    obraId = obra.Id,
    titulo = obra.Titulo,
    iswc = obra.Iswc,
});

await _obraRepo.SaveChangesAsync(ct); // salva entidade + outbox na mesma transação
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] 8 handlers têm IOutboxEventWriter injetado
- [ ] Cada AddEvent usa a constante EventTypes correta
- [ ] AddEvent é chamado ANTES do SaveChangesAsync (verificar ordem)
