---
status: done
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"4.0, 6.0"</unblocks>
</task_context>

# Tarefa 3.0: Domain — Extensão Fonograma + ValidadorLiberacaoFonograma

## Visão Geral

Estender entidade Fonograma com UrlAudio, BloqueioJustificativa, métodos Liberar/Bloquear/Desbloquear/DefinirUrlAudio/TransicionarParaPendenteDocumentacao/RetornarParaPendenteValidacao. Criar ValidadorLiberacaoFonograma.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoFonograma.cs`
- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs` — +UrlAudio, +BloqueioJustificativa, +6 métodos. Atualizar Atualizar() para rejeitar BLOQUEADO. Atualizar PodeSerExcluido para incluir BLOQUEADO.

## Subtarefas

- [x] 3.1 Fonograma: +`UrlAudio` (string?), +`BloqueioJustificativa` (string?)
- [x] 3.2 +`DefinirUrlAudio(string?)` — rejeita LIBERADO/DEPURADO
- [x] 3.3 +`Liberar()` — PendenteDocumentacao → Liberado; rejeita outros
- [x] 3.4 +`Bloquear(string justificativa)` — Pendente*/Liberado → Bloqueado; rejeita Depurado
- [x] 3.5 +`Desbloquear()` — Bloqueado → PendenteValidacao
- [x] 3.6 +`TransicionarParaPendenteDocumentacao()` — silencioso se não PendenteValidacao
- [x] 3.7 +`RetornarParaPendenteValidacao()` — silencioso se não PendenteDocumentacao
- [x] 3.8 Atualizar `Atualizar()` e `PodeSerExcluido` para BLOQUEADO
- [x] 3.9 Criar `ValidadorLiberacaoFonograma.Validar(fonograma, somaConexos, obraLiberada)` → 4 itens
- [x] 3.10 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Liberar fonograma PENDENTE_DOCUMENTACAO → Liberado
- [x] Liberar fonograma PENDENTE_VALIDACAO → DomainException
- [x] DefinirUrlAudio em LIBERADO → DomainException
- [x] TransicionarParaPendenteDocumentacao de PendenteValidacao → PendenteDocumentacao
- [x] ValidadorLiberacaoFonograma retorna 4 itens
