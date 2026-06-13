---
status: pending
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>distribuicao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Testes unitarios dos handlers e repositorio

## Visao Geral

Implementa os testes unitarios para os dois query handlers e para os metodos JPQL novos do repositorio. Os testes dos handlers usam mocks de `CreditoRepository` e `ProcessoRepository`. O teste do repositorio usa mock de `EntityManager`. Estes testes devem ser escritos ao longo do desenvolvimento das Tasks 3.0 e 4.0.

## Requisitos

- `ListarTitularesDemonstrativoQueryHandlerTest`: 4 cenarios
- `ConsultarDemonstrativoTitularQueryHandlerTest`: 4 cenarios
- `JpaCreditoRepositoryTest`: 2 cenarios para os novos metodos
- Usar JUnit 5 + AssertJ + Mockito (padrao do projeto)
- Testes ficam em `distribuicao-tests/src/test/java/`

## Subtarefas

- [ ] 8.1 Criar `ListarTitularesDemonstrativoQueryHandlerTest` com os 4 cenarios abaixo
- [ ] 8.2 Criar `ConsultarDemonstrativoTitularQueryHandlerTest` com os 4 cenarios abaixo
- [ ] 8.3 Criar (ou estender) `JpaCreditoRepositoryTest` com 2 cenarios para os novos metodos

## Sequenciamento

- Bloqueado por: 3.0, 4.0 (handlers precisam existir para serem testados)
- Desbloqueia: 9.0 (boa pratica: unitarios antes de IT)
- Paralelizavel: Sim (pode rodar em paralelo com Task 5.0)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-tests/src/test/java/br/com/ecad/distribuicao/
  application/queries/handlers/ListarTitularesDemonstrativoQueryHandlerTest.java
  application/queries/handlers/ConsultarDemonstrativoTitularQueryHandlerTest.java
  infra/persistence/JpaCreditoRepositoryTest.java   ← pode ja existir; adicionar metodos
```

### ListarTitularesDemonstrativoQueryHandlerTest — cenarios

**Cenario 1: Processo nao encontrado**
- Mock: `processoRepository.findById(id)` retorna `Optional.empty()`
- Assertiva: `assertThatThrownBy(() -> handler.handle(query)).isInstanceOf(NotFoundException.class)`

**Cenario 2: Listagem com titularNome filtrado + merge de liberados**
- Mock: `creditoRepository.findTitularesByProcessoId(...)` retorna 2 projecoes
- Mock: `creditoRepository.sumLiberadosByProcessoLiberacaoId(...)` retorna Map com valor para 1 dos titulares
- Assertiva: titular sem liberado tem `totalLiberado = "0.00"`; titular com liberado tem valor correto

**Cenario 3: Ordenacao por totalAReceber**
- Mock: 3 titulares com totalAReceber diferentes
- Query com `sort = "totalAReceber"`
- Assertiva: primeiro item da lista tem o maior `totalAReceber`

**Cenario 4: Processo encontrado mas sem titulares**
- Mock: `creditoRepository.findTitularesByProcessoId(...)` retorna lista vazia
- Assertiva: retorna `TitularesDemonstrativoPageResponse` com `items = []` e `totalElements = 0`

### ConsultarDemonstrativoTitularQueryHandlerTest — cenarios

**Cenario 1: Titular sem creditos → NotFoundException**
- Mock: todas as 3 chamadas ao repositorio retornam listas vazias
- Assertiva: `NotFoundException` com mensagem contendo o titularId

**Cenario 2: Creditos em todos os 3 status → secoes corretas**
- Mock: 2 CALCULADO, 1 RETIDO, 1 LIBERADO
- Assertiva: `secao1.size() == 2`, `secao2.size() == 1`, `secao3.size() == 1`

**Cenario 3: totalAReceber = totalCalculado + totalLiberado (sem RETIDO)**
- Mock: CALCULADO com valor 600.00, RETIDO com 150.00, LIBERADO com 200.00
- Assertiva: `resumo.totalAReceber() == "800.00"`, `resumo.totalRetido() == "150.00"`

**Cenario 4: Secao 4 sempre vazia**
- Mock: qualquer conjunto de creditos validos
- Assertiva: `demonstrativo.ajustesEstorno().isEmpty() == true`, `demonstrativo.totalAjustesEstorno() == "0.00"`

### JpaCreditoRepositoryTest — cenarios para novos metodos

**Cenario 1: findTitularesByProcessoId com e sem filtro de nome**
- Setup: EntityManager mockado retornando TypedQuery mock
- Verificar que o parametro `:filtroNome` e passado como `null` quando ausente e como string lowercase quando presente

**Cenario 2: findByProcessoAndTitularAndStatus retorna somente creditos do status solicitado**
- Setup: EntityManager mockado retornando lista de Credito com status CALCULADO
- Verificar que o predicado de status e aplicado na query

### Padrao de construcao de mocks para Credito

```java
private Credito buildCredito(StatusCredito status, BigDecimal valor) {
    // usar construtor ou builder existente no projeto
    // preencher obraId, obraNome, titularId, titularNome, valorCredito, status
}
```

## Criterios de Sucesso

- `mvn -pl distribuicao-tests test -Dtest="ListarTitularesDemonstrativoQueryHandlerTest"` PASS
- `mvn -pl distribuicao-tests test -Dtest="ConsultarDemonstrativoTitularQueryHandlerTest"` PASS
- Nenhum teste precisa de Docker ou banco de dados (mocks puros)
- Cobertura dos 4 cenarios por handler (8 testes unitarios no total dos handlers)
