---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>none</dependencies>
<unblocks>"5.0, 6.0"</unblocks>
</task_context>

# Tarefa 4.0: Backend — CsvParser (parse, validação, agrupamento, duplicatas)

## Relacionada aos Requisitos

- RF-03 — Validação linha a linha
- RF-04 — Agrupamento linhas idênticas
- RF-05 — Detecção ISRC duplicado com horários divergentes
- RF-09 — Campos condicionais por rubrica

## Visão Geral

Implementar o CsvParser como serviço de lógica pura (sem dependências de banco ou HTTP). É o componente mais testável da feature — recebe um StreamReader e retorna resultado parseado com linhas agrupadas e lista de erros.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvParser.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvParseResult.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvLinha.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvLinhaAgrupada.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/ErroUploadDto.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CsvParserTests.cs`

## Subtarefas

- [ ] 4.1 Criar DTOs: `CsvLinha`, `CsvLinhaAgrupada`, `ErroUploadDto`, `CsvParseResult`
- [ ] 4.2 Implementar `CsvParser.Parse(StreamReader, bool exigeClassificacao)` — leitura linha a linha, split por `;`
- [ ] 4.3 Implementar `ValidarHeader()` — verifica colunas obrigatórias (isrc, iswc, inicio, fim, tipo_utilizacao, titulo_programa)
- [ ] 4.4 Implementar `ValidarLinha()` — formatos de hora, campos obrigatórios, siglas de tipo_utilizacao
- [ ] 4.5 Implementar `DetectarDuplicatas()` — mesmo ISRC + horários divergentes = erro; mesmo ISRC + horário + tipo divergente = erro em ambas
- [ ] 4.6 Implementar `Agrupar()` — GroupBy(ISRC/ISWC + início + fim + tipo_utilizacao + titulo_programa) → quantidade = Count()
- [ ] 4.7 Testes unitários `CsvParserTests.cs` — 10 cenários

## Sequenciamento

- Bloqueado por: Nenhum (lógica pura, sem dependência de infra)
- Desbloqueia: 5.0, 6.0 (CsvProcessorWorker usa CsvParser)
- Paralelizável: Sim (paralelo com 1.0, 2.0, 7.0)

## Detalhes de Implementação

**CsvParser.Parse — assinatura:**
```csharp
public class CsvParser
{
    private static readonly HashSet<string> TiposValidos = new() { "TA", "TE", "PE", "BK" };
    private static readonly string[] ColunasObrigatorias = { "isrc", "iswc", "inicio", "fim", "tipo_utilizacao", "titulo_programa" };

    public CsvParseResult Parse(StreamReader reader, bool exigeClassificacao)
    {
        // 1. Validar header
        // 2. Parse linha a linha → CsvLinha + erros
        // 3. Detectar duplicatas
        // 4. Remover linhas com erro de duplicata
        // 5. Agrupar linhas válidas
        // 6. Retornar CsvParseResult(agrupadas, erros, totalLinhas)
    }
}
```

**CsvParseResult:**
```csharp
public record CsvParseResult(
    List<CsvLinhaAgrupada> LinhasAgrupadas,
    List<ErroUploadDto> Erros,
    int TotalLinhas,
    bool IsErroGlobal = false,
    string? MensagemErroGlobal = null)
{
    public static CsvParseResult ErroGlobal(string mensagem) =>
        new(new(), new(), 0, true, mensagem);
}
```

**CsvLinhaAgrupada:**
```csharp
public record CsvLinhaAgrupada(
    string? Isrc, string? Iswc,
    TimeOnly Inicio, TimeOnly Fim,
    string? TipoUtilizacao, string? TituloPrograma,
    int Quantidade);
```

**ValidarLinha — regras:**
1. `isrc` OU `iswc` preenchido (ao menos um)
2. `inicio` formato `HH:mm:ss` válido
3. `fim` formato `HH:mm:ss` válido e > inicio
4. Se `exigeClassificacao`: `tipo_utilizacao` não vazio e ∈ {TA, TE, PE, BK}
5. Se `exigeClassificacao`: `titulo_programa` não vazio

**DetectarDuplicatas — cenários:**
- Mesmo ISRC, horários diferentes → erro na segunda linha
- Mesmo ISRC, mesmo horário, tipo_utilizacao diferente → erro em AMBAS linhas
- Mesmo ISRC, tudo igual → NÃO é erro (será agrupado)

**Testes — 10 cenários obrigatórios:**
1. `Parse_CsvValido3Linhas_3Execucoes`
2. `Parse_HeaderInvalido_ErroGlobal`
3. `Parse_LinhaSemIsrcNemIswc_ErroPorLinha`
4. `Parse_InicioMaiorQueFim_ErroPorLinha`
5. `Parse_AudiovisualSemTipoUtilizacao_ErroPorLinha`
6. `Parse_NaoAudiovisualSemTipoUtilizacao_Aceita`
7. `Parse_TipoUtilizacaoDesconhecido_ErroPorLinha`
8. `Parse_LinhasIdenticas_AgrupaQuantidade2`
9. `Parse_MesmoIsrcHorariosDivergentes_ErroSegundaLinha`
10. `Parse_MesmoIsrcMesmoHorarioTipoDivergente_ErroAmbasLinhas`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~CsvParserTests"`
- [ ] 10 cenários cobertos
- [ ] Parser é lógica pura — sem dependência de DbContext, HttpClient ou serviço externo
