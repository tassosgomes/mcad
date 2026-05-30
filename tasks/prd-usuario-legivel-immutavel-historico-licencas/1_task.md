---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>arrecadacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0, 3.0, 4.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 1.0: Migration V14 e campos de ator historico no dominio

## Relacionada as User Stories

- [HU-03] Auditor ou PO precisa de identidade imutavel no historico
- [HU-04] Operacao nao pode ser bloqueada por sincronizacao atrasada

## Visao Geral

Adicionar a base persistente para snapshots de ator nos historicos da Arrecadacao. A migration deve criar colunas nullable e indices nos pontos definidos pela Tech Spec, sem migrar dados existentes. As entidades de dominio devem expor os novos campos com getters e factories/metodos capazes de preencher `subject` e rotulo congelado para novos registros, preservando compatibilidade com historicos antigos.

## Requisitos

- Criar migration Flyway `V14__add_actor_snapshot_to_arrecadacao_history.sql`.
- Adicionar colunas nullable em `historico_status_licenca`, `historico_status_usuario`, `uda_valor` e `pagamento`.
- Criar indices parciais/recomendados por `*_subject` quando o banco suportar `WHERE ... IS NOT NULL`.
- Nao adicionar `NOT NULL` e nao atualizar/backfill de registros existentes.
- Atualizar entidades `HistoricoStatusLicenca`, `HistoricoStatusUsuario`, `UdaValor` e `Pagamento`.
- Manter campos legados `autor`, `criado_por` e `estornado_por` para compatibilidade.
- Corrigir guards para nao permitir `autor` em branco em novos historicos quando a nova factory receber snapshot.

## Subtarefas

- [ ] 1.1 Criar `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V14__add_actor_snapshot_to_arrecadacao_history.sql`.
- [ ] 1.2 Adicionar `ator_subject VARCHAR(128)` e `autor_rotulo VARCHAR(512)` em `historico_status_licenca`.
- [ ] 1.3 Adicionar `ator_subject VARCHAR(128)` e `autor_rotulo VARCHAR(512)` em `historico_status_usuario`.
- [ ] 1.4 Adicionar `criado_por_subject VARCHAR(128)` e `criado_por_rotulo VARCHAR(512)` em `uda_valor`.
- [ ] 1.5 Adicionar `estornado_por_subject VARCHAR(128)` e `estornado_por_rotulo VARCHAR(512)` em `pagamento`.
- [ ] 1.6 Criar indices `ix_hist_licenca_ator_subject`, `ix_hist_usuario_ator_subject`, `ix_uda_valor_criado_por_subject` e `ix_pagamento_estornado_por_subject`.
- [ ] 1.7 Atualizar mapeamentos JPA e getters das quatro entidades afetadas.
- [ ] 1.8 Adicionar factories/overloads ou metodos de dominio que recebam `subject` e rotulo congelado sem quebrar chamadas antigas.
- [ ] 1.9 Testes unitarios de entidades cobrindo persistencia dos novos campos, compatibilidade com valores legados e rejeicao de rotulo/autor em branco em novos fluxos.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0, 5.0, 6.0
- Paralelizavel: Nao (estabiliza schema e entidades compartilhadas)

## Rastreabilidade

- Esta tarefa cobre: armazenamento imutavel, compatibilidade com historicos antigos e ausencia de backfill.
- Evidencia esperada: migration aplica em banco limpo; entidades compilam com colunas nullable; testes unitarios de dominio passam.

## Detalhes de Implementacao

DDL esperado pela Tech Spec:

```sql
ALTER TABLE arrecadacao.historico_status_licenca
    ADD COLUMN ator_subject VARCHAR(128),
    ADD COLUMN autor_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.historico_status_usuario
    ADD COLUMN ator_subject VARCHAR(128),
    ADD COLUMN autor_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.uda_valor
    ADD COLUMN criado_por_subject VARCHAR(128),
    ADD COLUMN criado_por_rotulo VARCHAR(512);

ALTER TABLE arrecadacao.pagamento
    ADD COLUMN estornado_por_subject VARCHAR(128),
    ADD COLUMN estornado_por_rotulo VARCHAR(512);
```

As entidades devem continuar permitindo registros antigos sem `subject` e sem rotulo novo. Para novos registros, o campo legado deve receber o mesmo rotulo humano congelado que sera retornado no DTO.

## Criterios de Sucesso

- Migration `V14` aplica sem alterar linhas historicas existentes.
- Nenhuma nova coluna e obrigatoria para registros antigos ou seeds.
- Entidades expoem getters para `subject` e rotulo congelado nos quatro alvos.
- Testes de dominio demonstram que novos snapshots sao persistiveis e campos legados continuam disponiveis.
