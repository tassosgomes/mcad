---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>distribuicao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0", "8.0"</unblocks>
</task_context>

# Tarefa 4.0: ConsultarDemonstrativoTitularQueryHandler

## Visao Geral

Implementa o caso de uso de demonstrativo detalhado de um titular especifico em um processo. Faz 4 chamadas ao repositorio (uma por status + validacao do processo) e monta o `DemonstrativoTitularResponse` com as quatro secoes. Pode ser desenvolvida em paralelo com Task 3.0.

## Requisitos

- Criar `ConsultarDemonstrativoTitularQuery` record com campos: processoId, titularId
- Criar `ConsultarDemonstrativoTitularQueryHandler` que retorna `DemonstrativoTitularResponse`
- Validar existencia do processo; lancar `NotFoundException` se ausente
- Se nenhum credito do titular no processo → lancar `NotFoundException` com mensagem especifica (RF-06)
- Secao 1 (CALCULADO): `findByProcessoAndTitularAndStatus(processoId, titularId, StatusCredito.CALCULADO)`
- Secao 2 (RETIDO): `findByProcessoAndTitularAndStatus(processoId, titularId, StatusCredito.RETIDO)`
- Secao 3 (LIBERADO): `findLiberadosByProcessoLiberacaoAndTitular(processoId, titularId)`
- Secao 4: sempre `Collections.emptyList()` e `totalAjustesEstorno = "0.00"` (F06 preenchere)
- `totalAReceber = sum(CALCULADO) + sum(LIBERADO)` — RETIDO nao entra (RF-11)
- `totalRetido = sum(RETIDO do periodo atual, processoId = id)` (RF-12)

## Subtarefas

- [ ] 4.1 Criar `ConsultarDemonstrativoTitularQuery` record em `distribuicao-application/.../application/queries/`
- [ ] 4.2 Criar `ConsultarDemonstrativoTitularQueryHandler` em `distribuicao-application/.../application/queries/handlers/`
- [ ] 4.3 Injetar `ProcessoRepository` e `CreditoRepository` via construtor
- [ ] 4.4 Implementar logica de validacao: processo inexistente → NotFoundException; sem creditos do titular → NotFoundException com mensagem "Titular nao possui creditos neste processo"
- [ ] 4.5 Implementar mapeamento de `Credito` (CALCULADO) → `CreditoCalculadoItem` (percentual em 6 casas, valores em 2 casas)
- [ ] 4.6 Implementar mapeamento de `Credito` (RETIDO) → `CreditoRetidoItem` (motivoRetencao legivel)
- [ ] 4.7 Implementar mapeamento de `Credito` (LIBERADO) → `CreditoLiberadoItem` (processoOrigemId = credito.processoId)
- [ ] 4.8 Calcular `ResumoFinanceiroResponse` a partir das listas (soma dos valores por status)
- [ ] 4.9 Construir e retornar `DemonstrativoTitularResponse` com todos os campos

## Sequenciamento

- Bloqueado por: 1.0, 2.0
- Desbloqueia: 5.0, 8.0
- Paralelizavel: Sim (pode ser desenvolvida em paralelo com Task 3.0)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/
  queries/ConsultarDemonstrativoTitularQuery.java               ← novo
  queries/handlers/ConsultarDemonstrativoTitularQueryHandler.java  ← novo
```

### ConsultarDemonstrativoTitularQuery

```java
public record ConsultarDemonstrativoTitularQuery(UUID processoId, UUID titularId) {}
```

### Esqueleto do handler

```java
@Component
public class ConsultarDemonstrativoTitularQueryHandler {

    private final ProcessoRepository processoRepository;
    private final CreditoRepository creditoRepository;

    // construtor

    public DemonstrativoTitularResponse handle(ConsultarDemonstrativoTitularQuery query) {
        var processo = processoRepository.findById(query.processoId())
            .orElseThrow(() -> new NotFoundException("Processo nao encontrado: " + query.processoId()));

        var calculados  = creditoRepository.findByProcessoAndTitularAndStatus(
            query.processoId(), query.titularId(), StatusCredito.CALCULADO);
        var retidos     = creditoRepository.findByProcessoAndTitularAndStatus(
            query.processoId(), query.titularId(), StatusCredito.RETIDO);
        var liberados   = creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(
            query.processoId(), query.titularId());

        if (calculados.isEmpty() && retidos.isEmpty() && liberados.isEmpty()) {
            throw new NotFoundException(
                "Titular " + query.titularId() + " nao possui creditos no processo " + query.processoId());
        }

        // mapear para items de cada secao
        var secao1 = calculados.stream().map(this::toCalculadoItem).toList();
        var secao2 = retidos.stream().map(this::toRetidoItem).toList();
        var secao3 = liberados.stream().map(this::toLiberadoItem).toList();

        // calcular resumo financeiro
        BigDecimal totalCalculado = sum(calculados);
        BigDecimal totalRetido    = sum(retidos);
        BigDecimal totalLiberado  = sum(liberados);
        BigDecimal totalAReceber  = totalCalculado.add(totalLiberado);

        var resumo = new ResumoFinanceiroResponse(
            format2(totalAReceber), format2(totalCalculado),
            format2(totalRetido), format2(totalLiberado), "0.00");

        String titularNome = !calculados.isEmpty() ? calculados.get(0).getTitularNome()
            : (!retidos.isEmpty() ? retidos.get(0).getTitularNome()
            : liberados.get(0).getTitularNome());

        return new DemonstrativoTitularResponse(
            processo.getId(),
            processo.getStatus(),
            processo.getRubricaSigla(),
            processo.getPeriodo(),
            query.titularId(),
            titularNome,
            resumo,
            secao1,
            secao2,
            secao3,
            Collections.emptyList(),
            "0.00"
        );
    }
}
```

### Mapeamento de CreditoRetidoItem — motivoRetencao

O `motivoRetencao` e uma String no entity `Credito` (persiste o enum como string). No DTO `CreditoRetidoItem` usar diretamente — o frontend exibe o badge.

### processoOrigemId em CreditoLiberadoItem

Para creditos LIBERADO: `credito.getProcessoId()` e o processo de origem (onde o credito foi gerado e ficou retido). `credito.getProcessoLiberacaoId()` e o processo atual (onde foi liberado).

```java
private CreditoLiberadoItem toLiberadoItem(Credito c) {
    return new CreditoLiberadoItem(
        c.getObraId(), c.getObraNome(),
        c.getFonogramaId(), c.getFonogramaNome(),
        c.getCategoria(),
        c.getProcessoId(),       // processoOrigemId
        c.getMotivoRetencao(),   // motivoOriginal
        format2(c.getValorCredito()),
        c.getLiberadoEm()
    );
}
```

## Criterios de Sucesso

- `totalAReceber = totalCalculado + totalLiberado` — verificar com valores do banco de desenvolvimento
- Titular sem creditos retorna 404 (RF-06)
- Processo inexistente retorna 404
- Secao 4 e sempre `[]` e `totalAjustesEstorno = "0.00"`
- `mvn -pl distribuicao-application compile` passa sem erros
