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
