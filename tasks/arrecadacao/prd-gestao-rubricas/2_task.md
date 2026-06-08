---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>3.0, 4.0</unblocks>
</task_context>

# Tarefa 2.0: Backend Arrecadação — Application

## Visão Geral

Implementar Commands, Handlers e DTOs para criação, atualização, inativação e reativação de rubricas. Publicar eventos de sincronização via Outbox Pattern.

## Requisitos

- 4 Commands + Handlers: Criar, Atualizar, Inativar, Ativar
- DTOs de Request e Response
- Publicar evento `arrecadacao.rubrica.atualizada` em toda mutação
- Validação de sigla única no handler de criação

## Subtarefas

- [ ] 2.1 Criar `CriarRubricaCommand` + `CriarRubricaCommandHandler`
  - Gerar UUID para `id`
  - Usar `SiglaSuggester` se `sigla` não informada
  - Validar unicidade de sigla via `rubricaRepository.existsBySigla()`
  - Criar entidade `Rubrica` e salvar
  - Publicar evento outbox
  - Retornar `RubricaResponse`
  
- [ ] 2.2 Criar `AtualizarRubricaCommand` + `AtualizarRubricaCommandHandler`
  - Buscar rubrica por ID (404 se não encontrada)
  - Atualizar `nome` e `exigeClassificacao`
  - Salvar e publicar evento outbox
  
- [ ] 2.3 Criar `InativarRubricaCommand` + `InativarRubricaCommandHandler`
  - Buscar rubrica por ID
  - Validar que está ativa
  - Chamar `rubrica.inativar()`
  - Salvar e publicar evento outbox
  - Retornar `RubricaResponse` atualizado
  
- [ ] 2.4 Criar `AtivarRubricaCommand` + `AtivarRubricaCommandHandler`
  - Buscar rubrica por ID
  - Validar que está inativa
  - Chamar `rubrica.ativar()`
  - Salvar e publicar evento outbox
  - Retornar `RubricaResponse` atualizado
  
- [ ] 2.5 Criar DTOs
  - `CriarRubricaRequest(String nome, boolean exigeClassificacao, String sigla)`
  - `AtualizarRubricaRequest(String nome, boolean exigeClassificacao)`
  - `InativarRubricaRequest(String justificativa)`
  - `RubricaResponse(UUID id, String sigla, String nome, boolean exigeClassificacao, boolean ativo)`
  
- [ ] 2.6 Implementar publicação de evento Outbox
  - Usar `OutboxEventWriter.addEvent()`
  - Tipo: `arrecadacao.rubrica.atualizada`
  - Subject: `rubrica.getId().toString()`
  - Payload: sigla, nome, exigeClassificacao, ativo

## Detalhes de Implementação

### CriarRubricaCommandHandler — Lógica de Sigla

```java
@Transactional
public RubricaResponse handle(CriarRubricaCommand cmd) {
    String sigla = cmd.siglaSugerida();
    if (sigla == null || sigla.isBlank()) {
        sigla = siglaSuggester.sugerir(cmd.nome());
    }
    if (rubricaRepository.existsBySigla(sigla)) {
        throw new ConflictException("Sigla '" + sigla + "' já cadastrada");
    }
    Rubrica rubrica = new Rubrica(UUID.randomUUID(), sigla, cmd.nome(), cmd.exigeClassificacao());
    rubrica = rubricaRepository.save(rubrica);
    publicarEvento(rubrica);
    return toResponse(rubrica);
}
```

### Evento Outbox

```java
private void publicarEvento(Rubrica rubrica) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("sigla", rubrica.getSigla());
    payload.put("nome", rubrica.getNome());
    payload.put("exigeClassificacao", rubrica.isExigeClassificacao());
    payload.put("ativo", rubrica.isAtivo());
    outboxEventWriter.addEvent(
        "arrecadacao.rubrica.atualizada",
        rubrica.getId().toString(),
        payload
    );
}
```

## Critérios de Sucesso

- [ ] Commands executam em transação atômica
- [ ] Evento outbox é escrito para toda mutação (criação, atualização, inativação, reativação)
- [ ] Sigla duplicada retorna erro de domínio (não exceção genérica)
- [ ] Handler de criação aceita sigla informada ou gera automaticamente
- [ ] Handler de inativação/ativação valida estado atual antes de transicionar
