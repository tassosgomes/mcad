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
