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
<unblocks>"2.0, 3.0, 4.0"</unblocks>
</task_context>

# Tarefa 1.0: Migration V13 + Domain Layer (Verba)

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (suporte — fornece a entidade)
- [HU-02] Recalculo automatico ao estornar pagamento (suporte)
- [HU-05] Visualizar status da verba (suporte — define o enum `StatusVerba`)

## Visao Geral

Criar a fundacao do agregado `Verba`: migration Flyway V13 com a tabela `arrecadacao.verbas`, entidade JPA com guards de dominio, enum `StatusVerba` e interface `VerbaRepository`. Reaproveita `VerbaEmDistribuicaoException` que ja existe no dominio (de F06 stub).

## Requisitos

- Tabela `arrecadacao.verbas` em `DECIMAL(15,2)` (alinha com `distribuicao.snapshots_verba`)
- Unique constraint `(rubrica_id, periodo)` para garantir RF-02
- Indices em `periodo` e `status` para suportar filtros do controller
- Entidade `Verba` com factory `abrir(...)` e metodos `recalcular`, `marcarEmDistribuicao`, `marcarDistribuida`
- Transicoes de status irreversiveis (RF-12); tentativa de retroceder lanca `IllegalStateException`
- `recalcular` lanca `VerbaEmDistribuicaoException` quando status `!= ABERTA`
- `setScale(2, RoundingMode.HALF_UP)` em todos os valores antes de persistir
- Calculo da liquida por **subtracao** (`bruto - ecad - assoc`) — nao por `× 0.85` direto — para evitar drift de arredondamento
- Manter `Rubrica` como `@ManyToOne` read-only para mapeamento DTO

## Subtarefas

- [ ] 1.1 Criar `V13__create_verbas.sql` em `arrecadacao-infra/src/main/resources/db/migration/`
- [ ] 1.2 Criar enum `StatusVerba { ABERTA, EM_DISTRIBUICAO, DISTRIBUIDA }` em `arrecadacao-domain/...enums/`
- [ ] 1.3 Criar entidade `Verba` em `arrecadacao-domain/...entities/` com factory e domain methods
- [ ] 1.4 Criar interface `VerbaRepository` em `arrecadacao-domain/...interfaces/` (somente assinaturas; impl JPA na task 2.0)
- [ ] 1.5 Confirmar que `VerbaEmDistribuicaoException` esta utilizavel a partir do dominio
- [ ] 1.6 Testes unitarios `VerbaTest` cobrindo: factory `abrir`, calculo de deducoes, transicao de status, guards, idempotencia de `marcarEmDistribuicao`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0
- Paralelizavel: Nao (fundacao)

## Rastreabilidade

- Esta tarefa cobre: HU-01 (suporte), HU-02 (suporte), HU-05 (suporte)
- Evidencia esperada: migration aplicada com sucesso, testes unitarios `VerbaTest` verdes (>= 8 casos), build `mvn -pl arrecadacao-domain compile` ok

## Detalhes de Implementacao

```sql
-- V13__create_verbas.sql
CREATE TABLE arrecadacao.verbas (
    id                      UUID           PRIMARY KEY,
    rubrica_id              UUID           NOT NULL REFERENCES arrecadacao.rubricas(id),
    periodo                 VARCHAR(7)     NOT NULL,
    valor_bruto_total       DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_ecad            DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_associacoes     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    verba_liquida           DECIMAL(15,2)  NOT NULL DEFAULT 0,
    quantidade_pagamentos   INTEGER        NOT NULL DEFAULT 0,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'ABERTA',
    criado_em               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verbas_rubrica_periodo UNIQUE (rubrica_id, periodo)
);
CREATE INDEX ix_verbas_periodo ON arrecadacao.verbas (periodo);
CREATE INDEX ix_verbas_status  ON arrecadacao.verbas (status);
```

Skeleton da entidade — atencao especial ao `recalcular` (ver `techspec.md`, secao "Entidade Verba"):

```java
public void recalcular(BigDecimal novoBruto, int qtdPagamentos) {
    if (status != StatusVerba.ABERTA) {
        throw new VerbaEmDistribuicaoException(
            "Verba %s/%s esta %s e nao pode ser alterada"
                .formatted(rubricaId, periodo, status));
    }
    this.valorBrutoTotal    = scale(novoBruto);
    this.deducaoEcad        = scale(novoBruto.multiply(new BigDecimal("0.10")));
    this.deducaoAssociacoes = scale(novoBruto.multiply(new BigDecimal("0.05")));
    this.verbaLiquida       = scale(valorBrutoTotal
                                  .subtract(deducaoEcad)
                                  .subtract(deducaoAssociacoes));
    this.quantidadePagamentos = qtdPagamentos;
    this.atualizadoEm = Instant.now();
}
```

## Criterios de Sucesso

- `mvn -pl arrecadacao-domain compile` ok
- `mvn -pl arrecadacao-domain test -Dtest=VerbaTest` verde com cobertura dos cenarios de aceite do PRD (RF-05: bruto 1000 → ecad 100, assoc 50, liquida 850; RF-03: 3 pagamentos somam corretamente)
- Migration aplica em base limpa via `./dev.sh start` sem erros
- Constraint unique impede inserir duas verbas com mesma `(rubrica_id, periodo)`
