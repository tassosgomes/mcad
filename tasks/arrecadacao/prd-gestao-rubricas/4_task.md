---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>distribuicao/infra</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>7.0</unblocks>
</task_context>

# Tarefa 4.0: Backend Distribuição — Sincronização de campo `ativo`

## Visão Geral

Atualizar o consumidor de eventos de rubrica na Distribuição para sincronizar o campo `ativo`. Ajustar entidade, payload e handler.

## Requisitos

- Migration adicionando `ativo` à tabela `distribuicao.rubricas`
- Atualizar entidade `Rubrica` no domínio Distribuição
- Atualizar `RubricaEventPayload` com campo `ativo`
- Atualizar `RubricaEventHandler` para sincronizar `ativo` no upsert

## Subtarefas

- [ ] 4.1 Criar migration `V{X}__add_ativo_rubrica_distribuicao.sql`
  ```sql
  ALTER TABLE distribuicao.rubricas 
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
  ```
  
- [ ] 4.2 Atualizar entidade `Rubrica` (distribuicao-domain)
  - Adicionar `private boolean ativo`
  - Adicionar getter `isAtivo()`
  - Atualizar `Rubrica.criar()` para receber `ativo`
  - Atualizar `Rubrica.atualizar()` para atualizar `ativo`
  
- [ ] 4.3 Atualizar `RubricaEventPayload`
  ```java
  public record RubricaEventPayload(
      String sigla,
      String nome,
      boolean exigeClassificacao,
      boolean ativo  // NOVO
  ) {}
  ```
  
- [ ] 4.4 Atualizar `RubricaEventHandler`
  - No `handle()`, passar `ativo` para `Rubrica.criar()` e `Rubrica.atualizar()`
  - Garantir que o upsert atualize o campo `ativo`

## Detalhes de Implementação

### RubricaEventHandler (atualizado)

```java
@Transactional
public void handle(RubricaEventPayload payload) {
    rubricaRepository.findBySigla(payload.sigla())
        .ifPresentOrElse(
            existing -> {
                existing.atualizar(payload.nome(), payload.exigeClassificacao(), payload.ativo());
                rubricaRepository.upsertBySigla(existing);
                LOGGER.info("Rubrica atualizada. sigla={} ativo={}", payload.sigla(), payload.ativo());
            },
            () -> {
                Rubrica rubrica = Rubrica.criar(
                    payload.sigla(),
                    payload.nome(),
                    payload.exigeClassificacao(),
                    payload.ativo()
                );
                rubricaRepository.upsertBySigla(rubrica);
                LOGGER.info("Rubrica sincronizada. sigla={} ativo={}", payload.sigla(), payload.ativo());
            }
        );
}
```

### Rubrica (distribuicao-domain) — atualizado

```java
@Entity
@Table(name = "rubricas", schema = "distribuicao")
public class Rubrica {
    // ... campos existentes ...
    @Column(name = "ativo", nullable = false)
    private boolean ativo;
    
    public static Rubrica criar(String sigla, String nome, boolean exigeClassificacao, boolean ativo) {
        // ...
        rubrica.ativo = ativo;
        // ...
    }
    
    public void atualizar(String nome, boolean exigeClassificacao, boolean ativo) {
        // ...
        this.ativo = ativo;
        this.sincronizadoEm = Instant.now();
    }
    
    public boolean isAtivo() { return ativo; }
}
```

## Critérios de Sucesso

- [ ] Evento `arrecadacao.rubrica.atualizada` com `ativo=false` inativa rubrica na Distribuição
- [ ] Evento com `ativo=true` reativa rubrica na Distribuição
- [ ] Consumo de evento não quebra com payloads antigos (sem campo `ativo`) — fallback para `true`
- [ ] Rubricas existentes na Distribuição mantêm `ativo=true` após migration
