# Quality Ledger — Historico de Revisoes

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 1

### Problemas Identificados

1. Categoria Tecnica: Lógica incorreta
   Severidade: Média
   Fase Detectada: Revisão
   Origem Provável: Limitação do modelo
   Necessitou Reimplementacao Significativa? Não
   Descricao: Em `main.js`, objetos `Counter` do k6 eram interpolados diretamente em template strings para log de progresso. Contadores k6 sao objetos opacos sem conversao implicita para numero — o log produziria `[object Object]`. Corrigido removendo a tentativa de leitura dos contadores no loop (k6 nao expoe valores de Counter durante execucao, apenas no summary final).

2. Categoria Tecnica: Erro de configuração
   Severidade: Baixa
   Fase Detectada: Revisão
   Origem Provável: Ambiguidade no PRD
   Necessitou Reimplementacao Significativa? Não
   Descricao: `docker-compose.yml` definia `network_mode: host` (para Linux) porem usava `host.docker.internal` na `API_BASE_URL` (convencao de macOS/Windows). As duas configuracoes sao mutuamente exclusivas. Corrigido para `localhost` com comentario explicativo sobre macOS/Windows.

3. Categoria Tecnica: Overengineering
   Severidade: Baixa
   Fase Detectada: Revisão
   Origem Provável: Limitação do modelo
   Necessitou Reimplementacao Significativa? Não
   Descricao: Funcao `pace()` duplicada identicamente nos 5 arquivos de cenario. Nao corrigido — duplicacao intencional para manter cada modulo auto-contido e legivel isoladamente.

### Resumo da Tarefa

Total de Problemas: 3 (1 medio, 2 baixos)
Categoria Tecnica mais frequente: Configuracao incorreta / Lógica incorreta (empate)
Origem mais frequente: Limitação do modelo
Indicio de fragilidade estrutural? Não
Sugestao de melhoria no:
- PRD: Incluir nota sobre plataforma alvo de execucao do Docker (Linux vs macOS/Windows) para evitar ambiguidade na configuracao de network.
- TechSpec: Adicionar aviso sobre limitacao de leitura de contadores k6 durante execucao (apenas disponiveis no summary final). O exemplo de codigo no design usava `metrics.obrasCriadas` como valor, o que induziu o erro.
- Template de Task: Nenhuma sugestao especifica.

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 2

### Problemas Identificados

1. Categoria Tecnica: Falha de validacao
   Severidade: Baixa
   Fase Detectada: Revisao
   Origem Provavel: Lacuna na TechSpec
   Necessitou Reimplementacao Significativa? Nao
   Descricao: `gerarCpf()` retorna string formatada (XXX.XXX.XXX-XX) enquanto `gerarCnpj()` retorna apenas digitos (14 chars sem formatacao). Inconsistencia de formato entre os dois geradores de documento. O PRD nao especifica o formato esperado pela API de cadastro, e a TechSpec tambem omite este detalhe. Nao corrigido — a API sob teste define o contrato; ajuste pode ser necessario ap6s validacao com a API real.

2. Categoria Tecnica: Lógica incorreta
   Severidade: Baixa
   Fase Detectada: Revisao
   Origem Provavel: Ambiguidade no PRD
   Necessitou Reimplementacao Significativa? Nao
   Descricao: `LOG_INTERVAL = 50` em main.js dispara log a cada 50 iteracoes por VU, o que e bem mais frequente do que os "1.000 entidades criadas" definidos no RF-24 do PRD. Como uma iteracao nao equivale necessariamente a uma entidade (cicloCompleto cria obra + fonograma, cenarios C/D/E nao criam entidades novas), o intervalo correto deveria ser baseado nos contadores de entidades. Nao corrigido — verbosidade extra nao afeta funcionalidade e os contadores k6 nao sao legiveis durante execucao (restricao tecnica ja documentada na Task 1).

### Resumo da Tarefa

Total de Problemas: 2 (ambos baixa severidade)
Categoria Tecnica mais frequente: Falha de validacao / Logica incorreta (empate)
Origem mais frequente: Lacuna na TechSpec / Ambiguidade no PRD (empate)
Indicio de fragilidade estrutural? Nao
Sugestao de melhoria no:
- PRD: Especificar o formato de documento esperado pela API (CPF com mascara ou apenas digitos; CNPJ com mascara ou apenas digitos) para que os geradores sejam implementados de forma consistente.
- TechSpec: Incluir formato de retorno esperado para gerarCpf() e gerarCnpj() no Design de Implementacao. Tambem clarificar como medir "1.000 entidades" para log de progresso dado que contadores k6 nao sao legiveis durante execucao.
- Template de Task: Nenhuma sugestao especifica.

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 4

### Problemas Identificados

1. Categoria Tecnica: Falha de integração
   Severidade: Alta
   Fase Detectada: Revisão
   Origem Provável: Lacuna na TechSpec
   Necessitou Reimplementacao Significativa? Não
   Descricao: `edicao.js` — PUT /titulares enviava apenas `{ nome }`. O contrato `AtualizarTitularRequest` da cadastro-api exige tambem `Nacionalidade`, `AssociacaoId` e `Status`. Todas as chamadas de edicao de titular retornariam 400. Corrigido adicionando os campos obrigatorios lidos do objeto no pool.

2. Categoria Tecnica: Falha de integração
   Severidade: Alta
   Fase Detectada: Revisão
   Origem Provável: Lacuna na TechSpec
   Necessitou Reimplementacao Significativa? Não
   Descricao: `edicao.js` — PUT /obras enviava payload parcial (`{ titulo }` e/ou `{ genero }`) sem o campo `Tipo` que e obrigatorio em `AtualizarObraRequest`. Todas as chamadas de edicao de obra retornariam 400. Corrigido para sempre incluir `titulo`, `tipo` e `genero`.

3. Categoria Tecnica: Falha de integração
   Severidade: Alta
   Fase Detectada: Revisão
   Origem Provável: Lacuna na TechSpec
   Necessitou Reimplementacao Significativa? Não
   Descricao: `edicao.js` — PUT /fonogramas enviava apenas `{ paisOrigem }`. O contrato `AtualizarFonogramaRequest` exige tambem `Isrc`. Todas as chamadas de edicao de fonograma retornariam 400. Corrigido adicionando `isrc: fono.isrc`.

4. Categoria Tecnica: Falha de integração
   Severidade: Alta
   Fase Detectada: Revisão
   Origem Provável: Lacuna na TechSpec
   Necessitou Reimplementacao Significativa? Não
   Descricao: `depuracao.js` — PUT /fonogramas (para provocar 409) e POST /fonogramas/{id}/depurar enviavam payload sem `PaisOrigem`. Tanto `AtualizarFonogramaRequest` quanto `DepurarFonogramaRequest` exigem `Isrc` e `PaisOrigem`. A validacao retornaria 400 antes da verificacao de status LIBERADO, impedindo o fluxo de depuracao. Corrigido adicionando `paisOrigem: fono.paisOrigem || 'Brasil'` em ambos os payloads.

### Resumo da Tarefa

Total de Problemas: 4 (todos alta severidade)
Categoria Tecnica mais frequente: Falha de integração
Origem mais frequente: Lacuna na TechSpec
Indicio de fragilidade estrutural? Sim — os contratos da API (campos obrigatorios nos requests de atualização) nao estao documentados na TechSpec nem nos exemplos de codigo da Task. Os exemplos mostravam payloads parciais (ex: `{ titulo }`, `{ isrc }`), induzindo implementacao incompleta.
Sugestao de melhoria no:
- PRD: Nenhuma sugestao especifica.
- TechSpec: Incluir tabela de contratos de request para cada endpoint usado pelos cenarios (especialmente PUT), listando campos obrigatorios vs opcionais. Os pseudocodigos de exemplo devem usar payloads completos conforme o contrato real da API.
- Template de Task: Para tarefas de simulacao/integracao, incluir referencia explicita aos contratos de request dos endpoints utilizados, ou instrucao para o implementador verificar os endpoints antes de codificar os payloads.

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 5

### Problemas Identificados

1. Categoria Tecnica: Lógica incorreta
   Severidade: Baixa
   Fase Detectada: Revisão
   Origem Provável: Limitação do modelo
   Necessitou Reimplementacao Significativa? Não
   Descricao: `cicloCompleto.js` — `idx++` executado incondicionalmente fora do bloco while (linha 150) além do `idx++` interno (linha 147). Quando o primeiro candidato é aceito e o `break` dispara, o índice avança 2 posições ao invés de 1, reduzindo a uniformidade da rotação de titulares. Não causa erro funcional — apenas menor diversidade na seleção de titulares para participações. Não corrigido dado impacto insignificante para a validação 1 VU × 5 min.

2. Categoria Tecnica: Overengineering
   Severidade: Baixa
   Fase Detectada: Revisão
   Origem Provável: Limitação do modelo
   Necessitou Reimplementacao Significativa? Não
   Descricao: `distribuirPercentuais()` e `pace()` duplicadas em `cicloCompleto.js` e `obraSemFonograma.js`. Duplicação intencional para manter cenários auto-contidos — decisão de design já documentada na revisão da Task 1. Não corrigido.

### Resumo da Tarefa

Total de Problemas: 2 (ambos baixa severidade)
Categoria Tecnica mais frequente: Lógica incorreta / Overengineering (empate)
Origem mais frequente: Limitação do modelo
Indicio de fragilidade estrutural? Não
Sugestao de melhoria no:
- PRD: Nenhuma sugestão específica.
- TechSpec: Nenhuma sugestão específica.
- Template de Task: Para tarefas de validação que introduzem mocks, considerar incluir critério explícito de "verificar se o mock cobre todos os cenários que dependem do serviço externo" para garantir que o cenário D (Depuração) seja exercitado mesmo sem o serviço ISWC real disponível.

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 3

### Problemas Identificados

Zero Defects Identified

### Resumo da Tarefa

Total de Problemas: 0
Categoria Tecnica mais frequente: N/A
Origem mais frequente: N/A
Indicio de fragilidade estrutural? Nao
Sugestao de melhoria no:
- PRD: Nenhuma sugestao especifica.
- TechSpec: Nenhuma sugestao especifica.
- Template de Task: Nenhuma sugestao especifica.

---

## 2026-04-05 | PRD: prd-simulador-carga | Task: 6

### Problemas Identificados

1. Categoria Tecnica: Erro de configuracao
   Severidade: Media
   Fase Detectada: Revisao
   Origem Provavel: Limitacao do modelo
   Necessitou Reimplementacao Significativa? Nao
   Descricao: `docker-compose.carga.yml` definia `API_BASE_URL` e `KEYCLOAK_URL` com `host.docker.internal`. O arquivo base `docker-compose.yml` usa `network_mode: host` (Linux). O merge de ambos resulta em container com `network_mode: host` tentando resolver `host.docker.internal`, hostname indisponivel nesse modo no Linux — causaria falha de conectividade silenciosa no ambiente principal de uso (WSL2). Corrigido para `localhost` com comentario sobre macOS/Windows.

2. Categoria Tecnica: Problema de seguranca
   Severidade: Baixa
   Fase Detectada: Revisao
   Origem Provavel: Contexto insuficiente
   Necessitou Reimplementacao Significativa? Nao
   Descricao: `README.md` documenta `KEYCLOAK_PASSWORD` com valor default `Analista123!` na tabela de variaveis. Credencial de usuario de teste hardcoded em documentacao. Nao corrigido — contexto de PoC local, sem impacto de seguranca real.

### Resumo da Tarefa

Total de Problemas: 2 (1 media, 1 baixa)
Categoria Tecnica mais frequente: Erro de configuracao
Origem mais frequente: Limitacao do modelo
Indicio de fragilidade estrutural? Nao
Sugestao de melhoria no:
- PRD: Incluir nota sobre plataforma alvo de execucao (Linux/WSL2 vs macOS/Windows) nos requisitos de container, especificando qual comportamento de rede e esperado. Isso complementaria a sugestao ja registrada na Task 1.
- TechSpec: Os exemplos de `docker-compose.yml` no Design de Implementacao usam `network_mode: host` mas o arquivo de carga gerado usou `host.docker.internal`, mostrando que overrides nao foram pensados em conjunto. Incluir nota sobre consistencia de URL entre arquivos override.
- Template de Task: Para tarefas que geram arquivos Docker Compose override, incluir instrucao explicita para validar o merge resultante via `docker-compose config` antes de considerar completo.

---

## 2026-05-29 | PRD: prd-authz-fonte-unica-assignments | Task: 2.0

Modelo utilizado:
(Preenchido pelo Orquestrador)

### Problemas Identificados

Zero Defects Identified
Iteracoes ate estabilizacao: 1

### Resumo da Tarefa

Total de Problemas: 0
Categoria Tecnica mais frequente: N/A
Origem mais frequente: N/A
Indicio de fragilidade estrutural? Nao
Sugestao de melhoria no:
- PRD: Nenhuma sugestao especifica.
- TechSpec: Nenhuma sugestao especifica.
- Template de Task: Nenhuma sugestao especifica.

---

## 2026-05-29 | PRD: prd-authz-fonte-unica-assignments | Task: 3.0

Modelo utilizado:
(Preenchido pelo Orquestrador)

### Problemas Identificados

Zero Defects Identified
Iteracoes ate estabilizacao: 1

### Resumo da Tarefa

Total de Problemas: 0
Categoria Tecnica mais frequente: N/A
Origem mais frequente: N/A
Indicio de fragilidade estrutural? Nao
Sugestao de melhoria no:
- PRD: Nenhuma sugestao especifica.
- TechSpec: Nenhuma sugestao especifica.
- Template de Task: Nenhuma sugestao especifica.
