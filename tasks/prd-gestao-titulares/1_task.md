---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Value Objects — Cpf, Cnpj, CaeIpi (records) + DomainException

## Relacionada às User Stories

- [HU-01] Cadastrar PF (suporte — validação CPF)
- [HU-02] Cadastrar PJ (suporte — validação CNPJ alfanumérico)

## Visão Geral

Criar os 3 Value Objects como `record` no Domain Layer + exception base `DomainException`. VOs encapsulam validação algorítmica: CPF (módulo 11 numérico), CNPJ (módulo 11 alfanumérico conforme nova regra RFB), CaeIpi (validação de tamanho). Serão usados diretamente na entidade Titular.

## Requisitos

- Cpf: record com factory Create(), validação módulo 11, propriedade Formatado (000.000.000-00)
- Cnpj: record com factory Create(), validação módulo 11 alfanumérico (ASCII-48), Formatado (A1.B2C.3D4/1A2B-99)
- CaeIpi: record com factory Create(), validação 1-20 chars
- DomainException: exception base para regras de domínio
- Todos: construtor privado, factory method Create() como único ponto de criação

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/CaeIpi.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Exceptions/DomainException.cs`
- **Referência:**
  - `docs/validacoes/cnpj.md` — algoritmo CNPJ alfanumérico RFB
  - `tasks/prd-gestao-titulares/techspec.md` — seção "Value Objects como Records"
- **Skills para consultar:**
  - `dotnet-architecture` — Value Objects, Domain Layer sem dependências
  - `dotnet-code-quality` — convenções, records

## Subtarefas

- [ ] 1.1 Criar `DomainException` — exception base para regras de domínio
- [ ] 1.2 Criar `Cpf` record — factory Create(), validação módulo 11, propriedade Valor e Formatado
- [ ] 1.3 Criar `Cnpj` record — factory Create(), validação alfanumérica RFB (ASCII-48), suporte retrocompatível numérico, Formatado
- [ ] 1.4 Criar `CaeIpi` record — factory Create(), validação 1-20 chars
- [ ] 1.5 Verificar build: `dotnet build`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0
- Paralelizável: Sim — pode executar em paralelo com 9.0 (Stitch) e 10.0 (frontend)

## Detalhes de Implementação

### Cpf (record)
```csharp
public record Cpf
{
    public string Valor { get; }
    private Cpf(string valor) => Valor = valor;

    public static Cpf Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^0-9]", "");
        if (limpo.Length != 11 || !IsValid(limpo))
            throw new DomainException("CPF inválido");
        return new Cpf(limpo);
    }

    public string Formatado => $"{Valor[..3]}.{Valor[3..6]}.{Valor[6..9]}-{Valor[9..]}";

    // Módulo 11 numérico padrão
    private static bool IsValid(string cpf) { ... }
}
```

### Cnpj (record) — conforme docs/validacoes/cnpj.md
```csharp
public record Cnpj
{
    public string Valor { get; }
    private Cnpj(string valor) => Valor = valor.ToUpperInvariant();

    public static Cnpj Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^a-zA-Z0-9]", "").ToUpperInvariant();
        if (limpo.Length != 14 || !IsValid(limpo))
            throw new DomainException("CNPJ inválido");
        return new Cnpj(limpo);
    }

    public string Formatado =>
        $"{Valor[..2]}.{Valor[2..5]}.{Valor[5..8]}/{Valor[8..12]}-{Valor[12..]}";

    private static bool IsValid(string cnpj)
    {
        if (!char.IsDigit(cnpj[12]) || !char.IsDigit(cnpj[13])) return false;
        int[] w1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        int[] w2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        // ASCII - 48 para conversão alfanumérica
        ...
    }
}
```

**Convenções:**
- Domain Layer sem dependências NuGet (zero PackageReferences)
- Records com igualdade por valor (built-in)
- Factory method `Create()` como único ponto de criação
- Construtor privado impede criação sem validação

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Domain project continua com 0 PackageReferences
- [ ] `Cpf.Create("12345678909")` — não lança para CPF válido
- [ ] `Cpf.Create("00000000000")` — lança DomainException
- [ ] `Cnpj.Create("11222333000181")` — aceita CNPJ numérico legado
- [ ] `Cnpj.Create("12ABC34501DE06")` — aceita CNPJ alfanumérico (se DVs válidos)
- [ ] `Cnpj.Create("INVALIDO")` — lança DomainException
- [ ] `CaeIpi.Create("123456789")` — não lança
- [ ] `CaeIpi.Create("")` — lança DomainException
