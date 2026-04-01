---
status: completed
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain — CalculadoraConexos (Domain Service)

## Visão Geral

Implementar o Domain Service `CalculadoraConexos` — classe estática com o algoritmo de cálculo automático de percentuais conforme Regulamento (43,7/41,7/14,6 ou 50/50). Algoritmo de arredondamento RN-12. **Componente mais testável do projeto** — testes paramétricos obrigatórios.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/CalculadoraConexos.cs`
- **Referência:**
  - `tasks/prd-participacao-conexa/techspec.md` (seção "CalculadoraConexos")
  - `docs/regra-distribuicao.md` (percentuais oficiais)
  - `docs/modelagem-titular.md` (cenários one-man-band e coletivo)
- **Skills:** `dotnet-architecture` — Domain Service; `dotnet-code-quality` — precisão decimal

## Subtarefas

- [ ] 2.1 Criar `CalculadoraConexos` estático com constantes: FatiaInterpreteCom=43.7m, FatiaProdutorCom=41.7m, FatiaMusicoCom=14.6m, FatiaInterpreteSem=50.0m, FatiaProdutorSem=50.0m
- [ ] 2.2 Método `Calcular(IList<ParticipacaoConexa>)` — valida ≥1 intérprete + ≥1 produtor, determina com/sem músico, distribui fatias
- [ ] 2.3 Método privado `DistribuirIgualitario(grupo, fatiaTotal)` — truncar 4 casas (`Math.Truncate(valor * 10000) / 10000`), diferença no primeiro (RN-12)
- [ ] 2.4 Validar: soma total sempre = 100.0000m após cálculo
- [ ] 2.5 Verificar build: `dotnet build`

## Detalhes de Implementação

```csharp
private static void DistribuirIgualitario(IList<ParticipacaoConexa> grupo, decimal fatiaTotal)
{
    int n = grupo.Count;
    decimal porParticipante = Math.Truncate(fatiaTotal / n * 10000m) / 10000m;
    foreach (var p in grupo)
        p.DefinirPercentual(porParticipante);
    decimal somaAtribuida = porParticipante * n;
    decimal diferenca = Math.Round(fatiaTotal - somaAtribuida, 4);
    if (diferenca != 0 && grupo.Any())
        grupo[0].DefinirPercentual(porParticipante + diferenca);
}
```

## Critérios de Sucesso (Verificáveis)

**Testes paramétricos obrigatórios:**
- [ ] Padrão com músico: 1 int, 1 prod, 1 musc → 43.7, 41.7, 14.6 (soma=100)
- [ ] Sem músico: 1 int, 1 prod → 50.0, 50.0 (soma=100)
- [ ] Dueto: 2 int, 1 prod, 2 musc → 21.85+21.85, 41.7, 7.3+7.3 (soma=100)
- [ ] 3 músicos arredondamento: 14.6÷3 → 4.8668+4.8666+4.8666 (soma fatia=14.6)
- [ ] 4 músicos: 14.6÷4 → 3.65×4 (soma=14.6)
- [ ] 3 intérpretes sem músico: 50÷3 → 16.6668+16.6666+16.6666 (soma=50)
- [ ] One-man-band: mesmo titular 3x (int+prod+musc) → 43.7+41.7+14.6
- [ ] Sem intérprete → DomainException
- [ ] Sem produtor → DomainException
- [ ] Soma total sempre 100.0000m
