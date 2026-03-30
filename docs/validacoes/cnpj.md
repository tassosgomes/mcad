# Documentação: Novo CNPJ Alfanumérico

## 1. Motivação e Contexto
A Receita Federal do Brasil implementou o **CNPJ Alfanumérico** para expandir a capacidade de geração de novos números de inscrição. 

* **O Problema:** O formato estritamente numérico permitia cerca de 99,9 milhões de combinações na base do CNPJ, volume que estava próximo do limite.
* **A Solução:** Ao permitir letras (A-Z) nas posições da base e da ordem do estabelecimento, a capacidade saltou para quase **1 trilhão** de combinações possíveis.

## 2. Mudanças na Estrutura
O CNPJ permanece com **14 caracteres**, mas a composição mudou:

| Posição | Tipo | Descrição |
| :--- | :--- | :--- |
| 1ª à 8ª | Alfanumérico | **Base** do CNPJ |
| 9ª à 12ª | Alfanumérico | **Ordem** (Matriz/Filial) |
| 13ª à 14ª | **Numérico** | **Dígitos Verificadores (DV)** |

> [!IMPORTANT]
> Os CNPJs emitidos antes da mudança (exclusivamente numéricos) **continuam válidos** e não sofrerão alterações. O sistema é retrocompatível.

## 3. Lógica do Algoritmo
O cálculo do Dígito Verificador (DV) continua utilizando o algoritmo **Módulo 11**, mas com uma etapa prévia de conversão de caracteres.

### Conversão Alfanumérica
Para o cálculo matemático, cada caractere é convertido em um valor decimal baseado na tabela **ASCII**:
$$\text{Valor} = \text{ASCII}(\text{caractere}) - 48$$

* **Números (0-9):** Mantêm seu próprio valor (ex: '5' vira 5).
* **Letras (A-Z):** Seguem a sequência (ex: 'A' vira 17, 'B' vira 18, ..., 'Z' vira 42).

### Pesos e Cálculo
1.  **DV1 (13ª posição):** Multiplica-se os 12 primeiros caracteres pelos pesos `5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2`.
2.  **DV2 (14ª posição):** Multiplica-se os 13 primeiros caracteres (incluindo o DV1) pelos pesos `6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2`.
3.  **Resultado:** Se o resto da divisão da soma por 11 for menor que 2, o DV é **0**. Caso contrário, o DV é **11 - resto**.

## 4. Implementação em C#

```csharp
using System;
using System.Text.RegularExpressions;

public static class CnpjValidator
{
    private static readonly int[] Weights1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
    private static readonly int[] Weights2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };

    public static bool IsValid(string cnpj)
    {
        if (string.IsNullOrWhiteSpace(cnpj)) return false;

        // Limpeza e normalização
        cnpj = Regex.Replace(cnpj, @"[^a-zA-Z0-9]", "").ToUpper();

        if (cnpj.Length != 14) return false;

        // DVs finais devem ser sempre numéricos
        if (!char.IsDigit(cnpj[12]) || !char.IsDigit(cnpj[13])) return false;

        string baseCnpj = cnpj.Substring(0, 12);
        string digitsReceived = cnpj.Substring(12, 2);

        int dv1 = CalculateDigit(baseCnpj, Weights1);
        int dv2 = CalculateDigit(baseCnpj + dv1, Weights2);

        return digitsReceived == $"{dv1}{dv2}";
    }

    private static int CalculateDigit(string input, int[] weights)
    {
        int sum = 0;
        for (int i = 0; i < weights.Length; i++)
        {
            // Lógica ASCII - 48 conforme orientação da RFB
            int value = input[i] - 48;
            sum += value * weights[i];
        }

        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
```

## 5. Recomendações de Banco de Dados
Evite tipos de dados numéricos (como `BIGINT`) para armazenar o CNPJ. Utilize tipos de string de tamanho fixo ou variável:
* **SQL Server:** `VARCHAR(14)` ou `CHAR(14)`
* **PostgreSQL:** `VARCHAR(14)`

---