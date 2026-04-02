---
status: done
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Application Fix — CalcularPercentuaisHandler (transição automática) + AtualizarFonogramaHandler (urlAudio) + Responses

## Visão Geral

Extensões em handlers e responses existentes: (1) CalcularPercentuaisHandler dispara transição automática PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO quando soma=100%, (2) AtualizarFonogramaHandler aceita urlAudio, (3) Responses de obras e fonogramas incluem novos campos.

## Arquivos Envolvidos

- **Modificar:**
  - `2-Application/.../Participacoes/Commands/CalcularPercentuaisCommandHandler.cs` — após cálculo com soma=100% → fonograma.TransicionarParaPendenteDocumentacao(). Se soma cai < 100% (após remoção) → fonograma.RetornarParaPendenteValidacao().
  - `2-Application/.../Fonogramas/Commands/AtualizarFonogramaCommandHandler.cs` — aceitar urlAudio no command, chamar fonograma.DefinirUrlAudio()
  - `2-Application/.../Fonogramas/Commands/AtualizarFonogramaCommand.cs` — +UrlAudio property
  - `2-Application/.../Fonogramas/Responses/FonogramaResponse.cs` — +urlAudio, +bloqueioJustificativa
  - `2-Application/.../Obras/Responses/ObraResponse.cs` — +bloqueioJustificativa

## Subtarefas

- [x] 7.1 CalcularPercentuaisHandler: após cálculo, se soma==100% → fonograma.TransicionarParaPendenteDocumentacao()
- [x] 7.2 RemoverParticipacaoHandler: se soma cai < 100% após remoção → fonograma.RetornarParaPendenteValidacao()
- [x] 7.3 AtualizarFonogramaCommand: +UrlAudio (string?). Handler: fonograma.DefinirUrlAudio(cmd.UrlAudio)
- [x] 7.4 FonogramaResponse: +urlAudio, +bloqueioJustificativa
- [x] 7.5 ObraResponse: +bloqueioJustificativa
- [x] 7.6 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Calcular com soma=100% → fonograma status PENDENTE_DOCUMENTACAO
- [x] Remover participação fazendo soma < 100% → fonograma volta PENDENTE_VALIDACAO
- [x] PUT /fonogramas/{id} com urlAudio → salva
- [x] GET /fonogramas/{id} retorna urlAudio e bloqueioJustificativa
- [x] GET /obras/{id} retorna bloqueioJustificativa
