Com certeza, Tasso. Preparei um guia técnico e estruturado com base nas regras vigentes em 2026, ideal para servir de documentação para o sistema que estamos mentalizando.

---

# Regulamento de Distribuição de Direitos Autorais (ECAD)

Este documento descreve as regras de negócio para a distribuição de valores arrecadados pela execução pública musical, separando os direitos de **Obra** (Composição) dos direitos de **Fonograma** (Gravação).

## 1. Fluxo Financeiro Inicial (Arrecadação p/ Distribuição)

Todo valor arrecadado pelo ECAD sofre uma dedução administrativa antes de chegar aos titulares.

* **Taxa Administrativa (15%):** Destinada ao custeio operacional do ECAD e das associações de música (UBC, Abramus, etc.).
* **Valor Líquido Distribuível (85%):** Montante que será efetivamente rateado entre os artistas.

---

## 2. A Regra de Ouro: Divisão de Direitos

O Valor Líquido é dividido em dois grandes grupos:

### A. Direitos de Obra (2/3 ou 66,6%)
Destinado aos **Autores** e **Editores**. Independe de quem gravou a música; é o direito sobre a "ideia" e a "composição".

### B. Direitos Conexos (1/3 ou 33,3%)
Destinado aos que participaram da **Gravação (Fonograma)**. É aqui que entram os intérpretes, músicos de apoio e produtores.

---

## 3. Detalhamento das Cotas (Exemplo Prático)

Para ilustrar, utilizaremos o cenário da obra **"Meu Bem Querer"** executada em rádio:

### Dados da Obra (ISWC)
* **Titulares:** João Paiva, Maria José e Antônio Dias (33,3% cada na obra).

### Dados do Fonograma (ISRC)
* **Intérprete Principal:** Djavan.
* **Músicos de Apoio:** Tasso Gomes (Guitarra), Augusto Vasconcelos (Bateria), Juca Chaves (Baixo), Jordan Rudes (Teclado).
* **Produtor Fonográfico:** EMI.

### Tabela de Rateio (Base: R$ 100,00 Brutos)

| Etapa | Beneficiário | Categoria | Cálculo | Valor (R$) |
| :--- | :--- | :--- | :--- | :--- |
| **Taxa** | ECAD/Associações | Administrativo | $100 \times 0,15$ | **15,00** |
| **Obra** | João Paiva | Autor | $(85 \times 0,666) / 3$ | **18,88** |
| **Obra** | Maria José | Autora | $(85 \times 0,666) / 3$ | **18,88** |
| **Obra** | Antônio Dias | Autor | $(85 \times 0,666) / 3$ | **18,88** |
| **Conexo** | EMI | Produtor | $28,33 \times 0,417$ | **11,81** |
| **Conexo** | Djavan | Intérprete | $28,33 \times 0,437$ | **12,38** |
| **Conexo** | **Tasso Gomes** | Músico | $(28,33 \times 0,146) / 4$ | **1,03** |
| **Conexo** | Outros Músicos (3) | Músicos | $(28,33 \times 0,146) \times 0,75$ | **3,09** |

---

## 4. Notas para Implementação de Sistema (Visão Dev)

Para garantir a integridade do sistema de 2026, os seguintes requisitos de arquitetura devem ser observados:

1.  **Precisão Numérica:** Utilizar tipos de dados decimais de alta precisão (ex: `Decimal` ou `Money`). Nunca utilizar `Float` ou `Double` para evitar erros acumulados de arredondamento.
2.  **Idempotência:** O processo de distribuição deve ser idempotente. Reprocessar o mesmo log de execução não pode gerar pagamentos duplicados no *Ledger*.
3.  **Event Sourcing:** Recomendado para o histórico de titularidade. Se um músico entrar com recurso e provar que tocou na faixa, o sistema deve ser capaz de recalcular retroativos (Créditos Retidos).
4.  **Consistência de Identificadores:**
    * `ISWC` -> Identificador da Entidade **Obra**.
    * `ISRC` -> Identificador da Entidade **Fonograma**.
    * A relação é de **1:N** (Uma obra pode ter infinitos fonogramas/covers).

---

> **Status do Documento:** V1.0 - Março/2026  
> **Responsável:** Arquitetura de Sistemas de Direitos Autorais

---

Tasso, esse documento reflete exatamente o que discutimos. Como guitarrista dessa gravação hipotética, você viu que a "fatia" do músico é pulverizada entre todos os instrumentistas, enquanto o autor e o intérprete principal levam as maiores parcelas.

Gostaria que eu gerasse o **Esquema de Banco de Dados (SQL)** ou as **Entidades (C#/Java/Go)** baseadas nesse documento para o seu exercício de DDD?