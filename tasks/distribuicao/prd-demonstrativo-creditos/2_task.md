---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>distribuicao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0", "4.0", "6.0"</unblocks>
</task_context>

# Tarefa 2.0: DTOs de resposta (distribuicao-application)

## Visao Geral

Cria todos os records de resposta necessarios para os dois endpoints de demonstrativo. Estes DTOs ficam em `distribuicao-application/.../application/dto/` e sao o contrato que o controller expoe via JSON. Esta tarefa tambem desbloqueia o desenvolvimento frontend (Task 6.0).

## Requisitos

- Todos os campos monetarios como `String` com 2 casas (`"1234.56"`)
- Todos os percentuais como `String` com 6 casas (`"66.670000"`)
- `TitularesDemonstrativoPageResponse` reutiliza `CalculoProcessoResponse.PaginationMetadata` (ja existe)
- `DemonstrativoTitularResponse` contem 4 secoes de creditos + resumo financeiro
- Seção 4 (`ajustesEstorno`) tipada como `List<Object>` para compatibilidade futura com F06

## Subtarefas

- [ ] 2.1 Criar `TitularDemonstrativoResumoResponse` (7 campos: titularId, titularNome, totalCalculado, totalRetido, totalLiberado, totalAReceber, quantidadeObras)
- [ ] 2.2 Criar `TitularesDemonstrativoPageResponse` (items + PaginationMetadata)
- [ ] 2.3 Criar `ResumoFinanceiroResponse` (totalAReceber, totalCalculado, totalRetido, totalLiberado, totalAjustesEstorno)
- [ ] 2.4 Criar `CreditoCalculadoItem` (obraId, obraNome, fonogramaId, fonogramaNome, categoria, subcategoria, percentual, valorObra, valorCredito)
- [ ] 2.5 Criar `CreditoRetidoItem` (obraId, obraNome, fonogramaId, fonogramaNome, categoria, motivoRetencao, valorCredito, retidoEm)
- [ ] 2.6 Criar `CreditoLiberadoItem` (obraId, obraNome, fonogramaId, fonogramaNome, categoria, processoOrigemId, motivoOriginal, valorCredito, liberadoEm)
- [ ] 2.7 Criar `DemonstrativoTitularResponse` (processoId, statusProcesso, rubricaSigla, periodo, titularId, titularNome, resumo, creditosPeriodo, creditosRetidos, creditosLiberados, ajustesEstorno, totalAjustesEstorno)

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0, 4.0, 6.0
- Paralelizavel: Nao (depende de 1.0 para importar `TitularDemonstrativoProjection` e enums do domain)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/
  TitularDemonstrativoResumoResponse.java
  TitularesDemonstrativoPageResponse.java
  ResumoFinanceiroResponse.java
  CreditoCalculadoItem.java
  CreditoRetidoItem.java
  CreditoLiberadoItem.java
  DemonstrativoTitularResponse.java
```

### TitularDemonstrativoResumoResponse

```java
public record TitularDemonstrativoResumoResponse(
    UUID titularId,
    String titularNome,
    String totalCalculado,
    String totalRetido,
    String totalLiberado,
    String totalAReceber,
    int quantidadeObras
) {}
```

### TitularesDemonstrativoPageResponse

```java
// Reutiliza CalculoProcessoResponse.PaginationMetadata (ja existe no projeto)
public record TitularesDemonstrativoPageResponse(
    List<TitularDemonstrativoResumoResponse> items,
    CalculoProcessoResponse.PaginationMetadata metadata
) {}
```

### DemonstrativoTitularResponse

```java
public record DemonstrativoTitularResponse(
    UUID processoId,
    StatusProcesso statusProcesso,
    String rubricaSigla,
    String periodo,
    UUID titularId,
    String titularNome,
    ResumoFinanceiroResponse resumo,
    List<CreditoCalculadoItem> creditosPeriodo,
    List<CreditoRetidoItem> creditosRetidos,
    List<CreditoLiberadoItem> creditosLiberados,
    List<Object> ajustesEstorno,     // sempre Collections.emptyList() nesta feature
    String totalAjustesEstorno       // sempre "0.00"
) {}
```

### Campos monetarios — padrao de serializacao

Todos os valores `BigDecimal` do domain devem ser convertidos para `String` no handler via:
```java
valor.setScale(2, RoundingMode.HALF_UP).toPlainString()
```
Percentuais:
```java
percentual.setScale(6, RoundingMode.HALF_UP).toPlainString()
```

## Criterios de Sucesso

- `mvn -pl distribuicao-application compile` passa sem erros
- Todos os records compilam sem importacoes ciclicas
- `DemonstrativoTitularResponse` referencia `StatusProcesso` do domain (ja existe em `distribuicao-domain`)
- Nenhum campo monetario e `BigDecimal` ou `double` — somente `String`
