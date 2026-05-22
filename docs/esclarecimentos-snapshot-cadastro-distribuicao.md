# Esclarecimentos — Snapshot do Cadastro na Distribuição

> Documento complementar a [`analise-snapshot-cadastro-distribuicao.md`](./analise-snapshot-cadastro-distribuicao.md).
> Registra as dúvidas conceituais discutidas e suas respostas.
> Data: 2026-05-19

---

## 1. Para que serve o snapshot, se o cálculo já busca os titulares?

**Dúvida:** para calcular o direito eu preciso saber, por obra/fonograma, quem eram os
titulares e suas participações. Como o snapshot ajuda nisso?

### O snapshot *é* esses dados — só que guardados

O cálculo já obtém essa informação: o `CalcularProcessoCommandHandler` chama
`POST /api/v1/distribuicao/ownership-snapshot` no Cadastro, que devolve a estrutura
`OwnershipSnapshot`:

```
OwnershipSnapshot
├── obras[]
│   ├── obraId, status
│   └── titularidades[]  →  titularId, nome, associacaoSigla, categoria, percentual
└── fonogramas[]
    ├── fonogramaId, obraId, status
    └── participacoes[]  →  titularId, nome, associacaoSigla, categoria, percentual
```

O snapshot **não ajuda a *descobrir* os titulares** — o endpoint já faz isso. O snapshot
ajuda a **não *perder*** essa resposta.

Hoje o handler:

1. chama o Cadastro → recebe o `OwnershipSnapshot`;
2. passa para a `CalculadoraCreditos` → gera os créditos;
3. **descarta** o `OwnershipSnapshot`.

O passo 3 é o problema. Os créditos ficam salvos, mas a resposta que os produziu some.
A proposta é apenas: **gravar essa resposta numa tabela** antes de descartá-la.

### Por que importa: a resposta do Cadastro muda com o tempo

"Quem são os titulares da obra X" é uma pergunta cuja resposta depende de *quando* você
pergunta. O Cadastro só sabe responder "quem **são** (agora)", não "quem **eram**".

Exemplo — competência **2026-03**, obra "X":

| Data | Evento | Titulares de "X" no Cadastro |
|---|---|---|
| 10/abr | Processo calculado → créditos gerados | João 50%, Maria 50% |
| 25/abr | Analista do Cadastro corrige a titularidade | João 33%, Maria 33%, Pedro 33% |
| 30/abr | Auditor pergunta: "crédito do João de março, por que 50%?" | João 33% |

- **Sem snapshot:** no dia 30/abr só dá para consultar o Cadastro ao vivo → "João 33%".
  O crédito salvo diz 50%. Não fecha, e não há como provar que o cálculo estava certo.
- **Com snapshot:** o processo guardou "João 50%, Maria 50%" no dia 10/abr. Consulta-se o
  snapshot → "João 50%". Bate com o crédito. Provado.

### Resumo

O snapshot não muda *como* o direito é calculado — a `CalculadoraCreditos` recebe a mesma
estrutura. Ele muda **o que sobra depois**:

- **Hoje:** sobram só os créditos (o "resultado"), sem o "porquê".
- **Com snapshot:** sobram os créditos **+ o retrato do cadastro que os gerou**.

É a diferença entre ter a nota fiscal e ter a nota fiscal com os itens discriminados. O
cálculo passa a ser **reproduzível** e **auditável**, mesmo que o cadastro mude depois.

---

## 2. Quando capturar o snapshot: no `CRIAR` ou no `CALCULAR`?

O `ProcessoDistribuicao` tem o ciclo de vida:

```
CRIAR ──────────► CALCULAR ──────────► APROVAR ──────────► FINALIZAR
  │                  │
  │  (janela: pode    │
  │   levar horas     │
  │   ou dias)        │
  ▼                  ▼
snapshot_rol_id    busca ownership
snapshot_verba_id  + gera créditos
já ficam ligados
```

Rol e Verba já são congelados no `CRIAR`. A questão é se o snapshot de ownership
acompanha (no `CRIAR`) ou é capturado só no `CALCULAR`.

### A questão real: o que fazer com a janela `CRIAR → CALCULAR`

| | **Capturar no `CRIAR`** | **Capturar no `CALCULAR`** (recomendado) |
|---|---|---|
| O que congela | Tudo (Rol + Verba + Ownership) no mesmo instante | Ownership no instante do cálculo |
| Janela `CRIAR→CALCULAR` | **Congelada** — mudanças no cadastro são ignoradas | **Janela de correção** — mudanças entram no cálculo |
| O cálculo lê o ownership de... | Da tabela (snapshot já existe) | De uma busca HTTP ao vivo no Cadastro |
| Mudança no `CriarProcessoCommandHandler` | Precisa parsear o Rol + chamar o Cadastro via HTTP | Nenhuma |
| Mudança no `CalcularProcessoCommandHandler` | Passa a ler ownership do snapshot | Persiste o que já busca hoje |
| Dependência do Cadastro no ar | No momento de **criar** | No momento de **calcular** (como já é hoje) |

### Por que a recomendação é `CALCULAR`

1. **O snapshot precisa bater 1:1 com os créditos.** Se a foto é tirada no `CRIAR` mas o
   cálculo, dias depois, busca o cadastro de novo, snapshot e créditos divergem e o
   retrato perde a função.
2. **A janela `CRIAR→CALCULAR` deve ser uma janela de correção.** Fluxo típico: o analista
   cria o processo, revisa os pré-requisitos, vê uma titularidade errada, pede a correção
   no Cadastro e só então calcula. Com captura no `CALCULAR`, a correção entra no cálculo.
3. **Custo de implementação.** O `CalcularProcessoCommandHandler` já parseia o Rol e já
   busca o ownership — capturar no `CALCULAR` é só persistir o que já está na mão.

### O argumento a favor do `CRIAR`

Capturando no `CRIAR`, o processo inteiro vira um retrato coerente do mesmo instante, o
cálculo fica 100% determinístico e sem I/O externo, e a janela `CRIAR→CALCULAR` fica
blindada. O contraponto: blinda a janela errada — na prática você *quer* poder corrigir o
cadastro entre criar e calcular.

### A decisão se reduz a uma pergunta de negócio

> A janela entre criar o processo e calcular os créditos é um **momento de revisão e
> correção** (→ capturar no `CALCULAR`) ou um **instante já congelado** (→ `CRIAR`)?

Para este domínio, "momento de correção" parece o comportamento certo — daí a
recomendação de **`CALCULAR`**. Em ambos os casos o problema original (ter o retrato) é
resolvido; muda só *qual* estado do cadastro o retrato representa.

---

## 3. Modelo mental consolidado

Pontos confirmados e ajustados ao longo da discussão:

- ✅ **O snapshot é um recorte, não o cadastro inteiro.** O Rol define quais
  obras/fonogramas foram executados na competência; só esses entram. Cadastro com 1
  milhão de obras + Rol com 8 mil = snapshot com 8 mil. Foto recortada, não panorâmica.

- ⚠️ **A foto é tirada no `CALCULAR`, não no `CRIAR`.** Ao iniciar o processo (`CRIAR`),
  só Rol e Verba ficam congelados. O snapshot de ownership só é tirado no `CALCULAR`.

- ✅ **A janela `CRIAR → CALCULAR` existe para revisar a qualidade do cadastro.** O
  processo já existe e os pré-requisitos estão fixos; o analista usa esse tempo para
  revisar as obras envolvidas e pedir correções. Tudo corrigido nessa janela entra no
  cálculo.

- ✅ **O `CALCULAR` é o corte.** No instante do cálculo a foto é tirada e o processo
  "fecha" contra o cadastro. Alterações posteriores não tocam mais nos créditos.

- ⚠️ **Reprodutibilidade — quando o snapshot vira "a base":**
  - No *primeiro* cálculo, o handler busca os dados ao vivo no Cadastro **e**, no mesmo
    instante, salva essa resposta como snapshot. Nesse momento, "cadastro ao vivo" e
    "snapshot" são o mesmo dado.
  - Dali pra frente, qualquer recálculo, verificação ou auditoria usa **o snapshot
    salvo**, nunca mais o cadastro ao vivo. O resultado é o mesmo — o que muda é que
    agora ele é **conferível depois**.

### Diagrama

```
CRIAR ──────────────► CALCULAR ──────────────► (futuro)
  │                      │                        │
Rol+Verba           tira a foto do            recálculo/auditoria
congelados          cadastro (recorte         leem a FOTO,
                    do Rol) + calcula         nunca o cadastro vivo
                    com ela = o "corte"
  └── janela de revisão ──┘
      do cadastro
```
