---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>distribuicao/domain+infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0", "3.0", "4.0"</unblocks>
</task_context>

# Tarefa 1.0: TitularDemonstrativoProjection + metodos CreditoRepository (domain + infra)

## Visao Geral

Cria a projecao JPQL `TitularDemonstrativoProjection` e adiciona 5 metodos novos a `CreditoRepository` (interface no domain + implementacao JPQL no infra). Esta tarefa e a base de toda a feature — sem ela nenhum handler pode ser implementado.

## Requisitos

- Criar record `TitularDemonstrativoProjection` em `distribuicao-domain/.../domain/projections/`
- Adicionar 5 novos metodos a interface `CreditoRepository` em `distribuicao-domain/.../domain/interfaces/`
- Implementar os 5 metodos em `JpaCreditoRepository` em `distribuicao-infra/.../infra/persistence/`
- As queries JPQL devem operar apenas sobre `distribuicao.creditos` (sem join cross-schema)
- `findTitularesByProcessoId` usa GROUP BY JPQL com `LOWER(c.titularNome)` para ordenacao case-insensitive

## Subtarefas

- [ ] 1.1 Criar `TitularDemonstrativoProjection` (record com 5 campos: titularId, titularNome, totalCalculado, totalRetido, quantidadeObras)
- [ ] 1.2 Adicionar assinatura `findTitularesByProcessoId(UUID processoId, String titularNomeFiltro, Pageable pageable)` a `CreditoRepository`
- [ ] 1.3 Adicionar assinatura `countTitularesByProcessoId(UUID processoId, String titularNomeFiltro)` a `CreditoRepository`
- [ ] 1.4 Adicionar assinatura `findByProcessoAndTitularAndStatus(UUID processoId, UUID titularId, StatusCredito status)` a `CreditoRepository`
- [ ] 1.5 Adicionar assinatura `findLiberadosByProcessoLiberacaoAndTitular(UUID processoLiberacaoId, UUID titularId)` a `CreditoRepository`
- [ ] 1.6 Adicionar assinatura `sumLiberadosByProcessoLiberacaoId(UUID processoLiberacaoId)` retornando `Map<UUID, BigDecimal>` a `CreditoRepository`
- [ ] 1.7 Implementar todos os 5 metodos em `JpaCreditoRepository` com JPQL correto
- [ ] 1.8 Validar que JPQL com GROUP BY compila sem erro no contexto JPA 3.1 / Hibernate 6

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0
- Paralelizavel: Nao (e a primeira tarefa do caminho critico)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/
  projections/TitularDemonstrativoProjection.java   ← novo
  interfaces/CreditoRepository.java                  ← +5 metodos

distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/
  persistence/JpaCreditoRepository.java              ← +5 implementacoes
```

### TitularDemonstrativoProjection

```java
package br.com.ecad.distribuicao.domain.projections;

public record TitularDemonstrativoProjection(
    UUID titularId,
    String titularNome,
    BigDecimal totalCalculado,
    BigDecimal totalRetido,
    long quantidadeObras   // COUNT CALCULADO; LIBERADO e adicionado pelo handler via merge
) {}
```

### Assinaturas dos metodos novos em CreditoRepository

```java
List<TitularDemonstrativoProjection> findTitularesByProcessoId(
    UUID processoId, String titularNomeFiltro, Pageable pageable);

long countTitularesByProcessoId(UUID processoId, String titularNomeFiltro);

List<Credito> findByProcessoAndTitularAndStatus(
    UUID processoId, UUID titularId, StatusCredito status);

List<Credito> findLiberadosByProcessoLiberacaoAndTitular(
    UUID processoLiberacaoId, UUID titularId);

Map<UUID, BigDecimal> sumLiberadosByProcessoLiberacaoId(UUID processoLiberacaoId);
```

### JPQL de findTitularesByProcessoId (referencia — adaptar ao padrao Hibernate 6 existente no projeto)

```jpql
SELECT new br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection(
    c.titularId,
    c.titularNome,
    SUM(CASE WHEN c.status = 'CALCULADO' THEN c.valorCredito ELSE 0 END),
    SUM(CASE WHEN c.status = 'RETIDO'    THEN c.valorCredito ELSE 0 END),
    COUNT(DISTINCT CASE WHEN c.status = 'CALCULADO' THEN c.obraId ELSE NULL END)
)
FROM Credito c
WHERE c.processoId = :processoId
  AND (:filtroNome IS NULL OR LOWER(c.titularNome) LIKE LOWER(CONCAT('%', :filtroNome, '%')))
GROUP BY c.titularId, c.titularNome
ORDER BY LOWER(c.titularNome) ASC
```

### JPQL de sumLiberadosByProcessoLiberacaoId

Retorna lista de Object[] com [titularId, soma] que o handler converte para Map:

```jpql
SELECT c.titularId, SUM(c.valorCredito)
FROM Credito c
WHERE c.processoLiberacaoId = :processoLiberacaoId AND c.status = 'LIBERADO'
GROUP BY c.titularId
```

### Indice — verificar existencia

Os indices `ix_creditos_processo_titular` e `ix_creditos_liberacao` criados em migracoes anteriores ja cobrem estes acessos. Confirmar com `\d distribuicao.creditos` no banco de desenvolvimento.

## Criterios de Sucesso

- `mvn -pl distribuicao-domain compile` passa sem erros
- `mvn -pl distribuicao-infra compile` passa sem erros
- JPQL de `findTitularesByProcessoId` nao lanca `QuerySyntaxException` ou `SemanticException` na inicializacao do contexto Spring
- `sumLiberadosByProcessoLiberacaoId` retorna `Map<UUID, BigDecimal>` corretamente populado para um processoLiberacaoId com creditos LIBERADO
