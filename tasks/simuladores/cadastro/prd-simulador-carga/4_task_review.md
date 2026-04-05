# Review — Task 4

## Status: ✅ Aprovado (com correções aplicadas)

## Validação de Requisitos
- [x] Requisitos da tarefa atendidos
- [x] Alinhado com PRD
- [x] Conforme Tech Spec
- [x] Critérios de aceitação satisfeitos

## Revisão de Código

### Problemas Encontrados

#### Problema 1 — Alta Severidade — edicao.js: PUT /titulares com campos obrigatórios ausentes
**Arquivo:** `services/load-test/scripts/scenarios/edicao.js`
**Categoria:** Falha de integração
**Descrição:** O PUT de titular enviava apenas `{ nome }`. O contrato `AtualizarTitularRequest` da
`cadastro-api` (TitularEndpoints.cs) exige: `Nome`, `Nacionalidade`, `AssociacaoId`, `Status`.
Com o payload incompleto, a API retornaria 400 para todas as chamadas de edição de titular.

#### Problema 2 — Alta Severidade — edicao.js: PUT /obras sem campo Tipo (obrigatório)
**Arquivo:** `services/load-test/scripts/scenarios/edicao.js`
**Categoria:** Falha de integração
**Descrição:** O PUT de obra enviava apenas `{ titulo }` e/ou `{ genero }`. O contrato
`AtualizarObraRequest` exige `Titulo` (obr.) e `Tipo` (obr.). A ausência de `tipo` causaria 400
em 100% das chamadas de edição de obra.

#### Problema 3 — Alta Severidade — edicao.js: PUT /fonogramas sem campo Isrc (obrigatório)
**Arquivo:** `services/load-test/scripts/scenarios/edicao.js`
**Categoria:** Falha de integração
**Descrição:** O PUT de fonograma enviava apenas `{ paisOrigem }`. O contrato
`AtualizarFonogramaRequest` exige `Isrc` (obr.) e `PaisOrigem` (obr.). A ausência de `isrc`
causaria 400 em 100% das chamadas de edição de fonograma.

#### Problema 4 — Alta Severidade — depuracao.js: PUT e POST /depurar de fonograma sem PaisOrigem
**Arquivo:** `services/load-test/scripts/scenarios/depuracao.js`
**Categoria:** Falha de integração
**Descrição:** O PUT para forçar o 409 no fonograma LIBERADO enviava apenas `{ isrc }`, sem
`paisOrigem`. O contrato `AtualizarFonogramaRequest` exige ambos. A validação de campos
obrigatórios retornaria 400 antes da verificação de status LIBERADO, impedindo o fluxo de
depuração. O POST /depurar tinha o mesmo problema: `DepurarFonogramaRequest` requer `Isrc` e
`PaisOrigem`.

**Nota sobre origem:** Os contratos da API não estavam documentados na TechSpec nem na Task 4.
A task descrevia o fluxo de depuração e o payload parcial como exemplo (`{ titulo }`, `{ isrc }`),
induzindo payloads incompletos. A origem é "Lacuna na TechSpec".

### Correções Aplicadas

1. **edicao.js — PUT titular:** Adicionados campos `nacionalidade`, `associacaoId`, `status` e
   `caeIpi`, lidos do objeto `titular` no pool (com fallbacks para valores padrão).

2. **edicao.js — PUT obra:** Simplificado para sempre incluir `titulo` (gerado), `tipo` (do pool)
   e `genero` (existente ou novo aleatório). Removida a lógica de "campos opcionais" que podia
   omitir `tipo`.

3. **edicao.js — PUT fonograma:** Adicionado `isrc: fono.isrc` (mantém o ISRC existente,
   alterando apenas `paisOrigem`), satisfazendo o contrato.

4. **depuracao.js — PUT fonograma LIBERADO:** Adicionado `paisOrigem: fono.paisOrigem || 'Brasil'`
   para garantir que a requisição passe a validação de campos obrigatórios e alcance a verificação
   de status LIBERADO (409).

5. **depuracao.js — POST /fonogramas/{id}/depurar:** Adicionado `paisOrigem` conforme
   `DepurarFonogramaRequest`.

### Itens validados sem correção necessária

- **cicloCompleto.js:** `distribuirPercentuais(n)` gera percentuais que somam exatamente 100%.
  Participações garantem posição 0=INTERPRETE, 1=PRODUTOR_FONOGRAFICO, restantes=MUSICO_EXECUTANTE.
  Status `_liberada`/`_liberado` rastreados corretamente.

- **obraSemFonograma.js:** Obra adicionada ao pool com `_liberada = false`, permitindo edição.
  Bootstrap de titular caso pool esteja vazio.

- **depuracao.js (fluxo de obra):** PUT de obra LIBERADA envia `{ titulo, tipo, genero }` —
  correto conforme `AtualizarObraRequest`. POST /depurar envia `{ titulo, tipo, genero }` —
  correto conforme `DepurarObraRequest`.

- **bloqueio.js:** Fluxo bloquear→delay→desbloquear correto. Delay 5-10s ajustado por
  `PACE_MULTIPLIER`. Counter `metrics.bloqueios` incrementado apenas em bloqueio bem-sucedido.

- **Integração com main.js:** Todos os cenários importados e utilizados corretamente.
  Seleção ponderada com `TOTAL_WEIGHT` calculado dinamicamente.

- **Duplicação de `pace()` e `distribuirPercentuais()`:** Intencional — cada módulo é auto-contido.
  Documentado como decisão aceita desde a Task 1.

## Build & Testes
- Build: N/A (k6 JavaScript — sem etapa de compilação)
- Testes: N/A (sem testes unitários para scripts k6; validação funcional é task 5.0)

## Conclusão da Tarefa
- [x] Implementação completada
- [x] Definição da tarefa, PRD e tech spec validados
- [x] Revisão de código completada
- [x] 4 problemas de alta severidade corrigidos (contratos da API)
- [x] Pronto para validação funcional (Task 5.0)
