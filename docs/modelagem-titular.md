Este documento detalha a modelagem lógica para o sistema de distribuição de direitos autorais, focando na flexibilidade entre a **Identidade** (PF/PJ) e os **Papéis de Titularidade** (Roles).

---

# Documento de Regras de Negócio: Modelagem de Titularidade (ECAD)

## 1. Premissa de Modelagem (Visão DDD)
Para suportar a complexidade do mercado fonográfico, o sistema não deve engessar o Titular a um único papel. A relação é de **1:N** entre uma Identidade e suas Participações.

* **Entidade Titular:** Representa a pessoa física ou jurídica (CPF/CNPJ).
* **Entidade Papel (Role):** Representa a função exercida na obra ou no fonograma.
* **Acúmulo de Papéis:** Uma única Identidade pode acumular todos os papéis de uma execução, recebendo a soma das frações correspondentes.

---

## 2. Cenário A: O "One-Man-Band" (Ex: Ed Motta)
Neste cenário, o artista é autossuficiente. Ele compõe, toca, interpreta e produz no próprio estúdio.

**Dados da Execução:**
* **Valor Bruto:** R$ 100,00
* **Taxa ECAD (15%):** R$ 15,00
* **Valor Líquido:** R$ 85,00

### Detalhamento das Participações (Acumuladas)

| Identidade (PF/PJ) | Papel Exercido | Domínio | % na Categoria | Valor Bruto do Papel |
| :--- | :--- | :--- | :--- | :--- |
| **Ed Motta (PF)** | Autor/Compositor | Obra (2/3) | 100% | R$ 56,66 |
| **Ed Motta (PF)** | Intérprete | Conexo (1/3) | 43,7% | R$ 12,38 |
| **Ed Motta (PJ)** | Produtor Fonográfico | Conexo (1/3) | 41,7% | R$ 11,81 |
| **Ed Motta (PF)** | Músico de Apoio | Conexo (1/3) | 14,6% | R$ 4,15 |
| **TOTAL CONSOLIDADO** | | | | **R$ 85,00** |



---

## 3. Cenário B: Produção Coletiva (N PFs/PJs)
Neste cenário, os direitos são pulverizados entre diversos especialistas. É o modelo padrão de grandes produções.

**Dados da Execução:**
* **Valor Líquido:** R$ 85,00

### Detalhamento das Participações (Distribuídas)

| Identidade (PF/PJ) | Papel Exercido | Domínio | % na Categoria | Valor Bruto do Papel |
| :--- | :--- | :--- | :--- | :--- |
| **João Paiva (PF)** | Autor 1 | Obra (2/3) | 33,3% | R$ 18,88 |
| **Maria José (PF)** | Autora 2 | Obra (2/3) | 33,3% | R$ 18,88 |
| **Antônio Dias (PF)** | Autor 3 | Obra (2/3) | 33,3% | R$ 18,88 |
| **Djavan (PF)** | Intérprete Principal | Conexo (1/3) | 43,7% | R$ 12,38 |
| **EMI (PJ)** | Produtor Fonográfico | Conexo (1/3) | 41,7% | R$ 11,81 |
| **Tasso Gomes (PF)** | Músico (Guitarra) | Conexo (1/3) | 3,65%* | R$ 1,03 |
| **Músicos (Outros 3)** | Músicos (Base) | Conexo (1/3) | 10,95%* | R$ 3,12 |
| **TOTAL CONSOLIDADO** | | | | **R$ 85,00** |

*\*Nota: Os 14,6% destinados aos músicos de apoio foram divididos igualmente por 4 profissionais.*

---

## 4. Requisitos para o Motor de Cálculo

Para implementar essa lógica, Tasso, o algoritmo de distribuição deve seguir estes passos de processamento:

1.  **Cálculo da Massa:** Subtrair a taxa administrativa (15%) do montante total.
2.  **Separação de Domínios:** Dividir o montante em dois "buckets": Obra (2/3) e Conexo (1/3).
3.  **Identificação de Participantes:** Consultar a tabela de junção (Join Table) que vincula o `ISRC` aos `Titulares` e seus respectivos `Papéis`.
4.  **Rateio por Papel:**
    * Se um papel (ex: Músico) tem múltiplos titulares, dividir a fatia do papel igualmente entre eles.
    * Se um titular tem múltiplos papéis, somar os créditos para o pagamento final.
5.  **Geração de Lançamentos (Ledger):** Criar entradas individuais de crédito para cada combinação de `Titular + Papel + Música`.



### Conclusão Técnica
Este modelo de "Acúmulo de Titularidades" é o mais resiliente. Ele permite que o sistema trate o Ed Motta e o Djavan com o mesmo código, mudando apenas a quantidade de linhas associadas ao ISRC no banco de dados. Isso evita o uso de condicionais (`if/else`) complexos no núcleo do sistema, delegando a regra para a estrutura de dados.