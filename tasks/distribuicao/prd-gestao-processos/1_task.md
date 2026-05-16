---
status: done
parallelizable: false
blocked_by: []
---

<task_context>
<domain>distribuicao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0, 3.0"</unblocks>
</task_context>

# Tarefa 1.0: Migration + Domain entities

## Relacionada às User Stories

- [HU-01] Receber snapshots de Rol e Verba (modelo de dados)
- [HU-02] Criar processo de distribuição (modelo de dados)

## Visão Geral

Criar a migration V2 (tabelas snapshots_rol, snapshots_verba, processos, outbox_events) e as entidades de domínio com máquina de estados encapsulada, enums, exceções e interfaces de repositório.

## Requisitos

- Migration V2 com 4 tabelas + índices + EXCLUDE constraint para unicidade
- Entidade ProcessoDistribuicao com factory method e transições de estado validadas
- Entidades SnapshotRol e SnapshotVerba
- Entidade OutboxEvent (portada de arrecadação)
- Enum StatusProcesso
- Exceções: TransicaoInvalidaException, ConflictException, PreRequisitosException
- Interfaces de repositório no domain

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-infra/src/main/resources/db/migration/V2__create_snapshots_processos_outbox.sql`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/ProcessoDistribuicao.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/SnapshotRol.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/SnapshotVerba.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/OutboxEvent.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/enums/StatusProcesso.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/ProcessoRepository.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/SnapshotRolRepository.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/SnapshotVerbaRepository.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/OutboxEventRepository.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/OutboxEventWriter.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/exceptions/TransicaoInvalidaException.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/exceptions/ConflictException.java`
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/exceptions/PreRequisitosException.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataProcessoRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaProcessoRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataSnapshotRolRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaSnapshotRolRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataSnapshotVerbaRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaSnapshotVerbaRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataOutboxEventRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaOutboxEventRepository.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/ProcessoSpecification.java`
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/OutboxEvent.java` (portar)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaOutboxEventRepository.java` (portar)
  - `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/Rubrica.java` (padrão entity)
  - `tasks/distribuicao/prd-gestao-processos/techspec.md` (design completo)

## Subtarefas

- [x] 1.1 Criar migration V2 (4 tabelas + índices + EXCLUDE constraint)
- [x] 1.2 Criar enum StatusProcesso
- [x] 1.3 Criar entidade ProcessoDistribuicao com factory, transições e validações
- [x] 1.4 Criar entidades SnapshotRol e SnapshotVerba
- [x] 1.5 Portar entidade OutboxEvent de arrecadação
- [x] 1.6 Criar exceções: TransicaoInvalidaException, ConflictException, PreRequisitosException
- [x] 1.7 Criar interfaces de repositório no domain (5 interfaces)
- [x] 1.8 Criar implementações JPA (SpringData + adapters) para todos os repositórios
- [x] 1.9 Criar ProcessoSpecification (JPA Specification para filtros dinâmicos)
- [x] 1.10 Verificar compilação

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0
- Paralelizável: Não (primeira tarefa)

## Detalhes de Implementação

A máquina de estados é encapsulada na entidade `ProcessoDistribuicao`. Cada método de transição valida o estado atual antes de transicionar. Ver techspec.md seção "Entidade ProcessoDistribuicao" para o código completo.

**EXCLUDE constraint PostgreSQL** para unicidade:
```sql
CONSTRAINT uq_processo_ativo EXCLUDE USING btree (rubrica_sigla WITH =, periodo WITH =)
    WHERE (status != 'CANCELADO')
```

**ProcessoSpecification** — JPA Specification para filtros dinâmicos (rubrica, periodo, status multi-value):
```java
public class ProcessoSpecification {
    public static Specification<ProcessoDistribuicao> comFiltros(String rubrica, String periodo, String status) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (rubrica != null) predicates.add(cb.equal(root.get("rubricaSigla"), rubrica));
            if (periodo != null) predicates.add(cb.equal(root.get("periodo"), periodo));
            if (status != null) {
                var statusList = Arrays.stream(status.split(","))
                    .map(StatusProcesso::valueOf).toList();
                predicates.add(root.get("status").in(statusList));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/distribuicao-api && mvn compile`
- [x] Migration V2 é SQL válido (4 tabelas, índices, EXCLUDE constraint)
- [x] ProcessoDistribuicao tem 5 métodos de transição (marcarCalculado, aprovar, finalizar, cancelar + factory criar)
- [x] Cada transição inválida lança TransicaoInvalidaException
- [x] cancelar() de FINALIZADO lança TransicaoInvalidaException
- [x] OutboxEvent portada com métodos: criar, marcarPublicado, incrementarTentativa, excedeuTentativas
