---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>cadastro/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Value Objects de Contato e Localização (Email, Telefone, Cep, Uf)

## Visão Geral

Criar os Value Objects de domínio necessários para a gestão de dados de contato do titular e para o auto-preenchimento de endereço (ViaCEP no frontend). Estes VOs seguem o padrão existente (`Cpf.cs`, `Cnpj.cs`, `CaeIpi.cs`): `record` com construtor privado e factory `Create` que lança `DomainException` em valor inválido.

Esta é a tarefa fundacional — todas as entidades e handlers de contato dependem destes VOs.

## Requisitos

- RF-11 (validação de formato de e-mail e telefone antes de persistir)
- Tech Spec — seção *Endereco VO* e *Telefones (coleção)*

## Subtarefas

- [ ] 1.1 Criar `3-Domain/Cadastro.Domain/ValueObjects/Email.cs` — `record` com `Create(string)` (valida formato via regex RFC simples), propriedade `Valor`, lança `DomainException("E-mail inválido")`. Espelhar `Cpf.cs`.
- [ ] 1.2 Criar `3-Domain/Cadastro.Domain/ValueObjects/Telefone.cs` — `record` com `Create(string numero)` que normaliza não-dígitos e valida DDD + 8/9 dígitos; expor `Formatado` (`(11) 99999-0000`). Lança `DomainException("Telefone inválido")`.
- [ ] 1.3 Criar `3-Domain/Cadastro.Domain/ValueObjects/Cep.cs` — `record` com `Create(string)` que aceita `"01001-000"` ou `"01001000"`, normaliza para 8 dígitos; expor `Formatado` (`01001-000`) e `Valor` (somente dígitos). Lança `DomainException("CEP inválido")`.
- [ ] 1.4 Criar `3-Domain/Cadastro.Domain/ValueObjects/Uf.cs` — `record` com `Create(string)` que valida 27 UFs brasileiras (case-insensitive, normaliza para maiúsculo). Lança `DomainException("UF inválida")`.
- [ ] 1.5 Criar `3-Domain/Cadastro.Domain/ValueObjects/Endereco.cs` — `record` imutável com `Cep`, `Logradouro`, `Numero` (string — aceita "S/N", "KM 12"), `Complemento?`, `Bairro`, `Cidade`, `Uf`. Factory estático `Create(...)` que valida campos obrigatórios.
- [ ] 1.6 Criar `3-Domain/Cadastro.Domain/Enums/TipoTelefone.cs` — enum `CELULAR`, `RESIDENCIAL`, `COMERCIAL`.
- [ ] 1.7 Criar `3-Domain/Cadastro.Domain/ValueObjects/TelefoneTitular.cs` — `record(TipoTelefone Tipo, Telefone Numero)` (ou reutilizar `Telefone` com tipo; alinhar com a decisão da tarefa 2.0 ao estender `Titular`).
- [ ] 1.8 Testes unitários em `5-Tests/Cadastro.UnitTests/ValueObjects/` — um arquivo por VO (`EmailTests.cs`, `TelefoneTests.cs`, `CepTests.cs`, `UfTests.cs`, `EnderecoTests.cs`) cobrindo: formato válido, formato inválido → `DomainException`, normalização (máscara/remoção), case-insensitive (UF). Naming: `{Method}_{Condition}_{ExpectedBehavior}`.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0
- Paralelizável: Sim (nenhum pré-requisito; não toca código existente)

## Detalhes de Implementação

Padrão de VO a seguir (de `3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs`):

```csharp
public sealed record Cpf
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
    private static bool IsValid(string cpf) { /* módulo 11 */ }
}
```

- `DomainException` está em `3-Domain/Cadastro.Domain/Exceptions/DomainException.cs` (mapeada a HTTP 422 pelo `GlobalExceptionHandler`).
- Os VOs **não** são mapeados com `OwnsOne` na entidade — o mapeamento EF (`HasConversion`) é feito na tarefa 3.0. Exceção: `Endereco` será persistido via `OwnsOne` (decisão da Tech Spec) — o mapeamento fica na tarefa 3.0, mas o VO em si é criado aqui.
- `Telefone` valida DDD (2 dígitos, 11–99 válidos) + 8 ou 9 dígitos. O nono dígito é opcional para celulares.

## Critérios de Sucesso

- Todos os VOs rejeitam valores inválidos com `DomainException` (mensagem em português).
- `Email.Create("a@x.com")` sucesso; `Email.Create("invalido")` → `DomainException`.
- `Cep.Create("01001-000").Valor == "01001000"` e `.Formatado == "01001-000"`.
- `Uf.Create("sp").Valor == "SP"`; `Uf.Create("XX")` → `DomainException`.
- Cobertura de testes unitários ≥ 90% para os VOs novos.
- `dotnet test 5-Tests/Cadastro.UnitTests` passa sem regressões.
