# PRD — F03: Upload de Execuções via CSV

> **Domínio:** Identificação (D02)
> **Feature:** F03 — Upload de Execuções via CSV
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-03

---

## 1. Visão Geral

O formulário manual (F02) atende cenários de poucas execuções, mas captações de rádio ou TV podem conter milhares de registros em um único dia. O upload via CSV permite ao Analista importar execuções em lote, com processamento assíncrono que valida, agrupa e identifica automaticamente cada linha, gerando um relatório detalhado de erros para correção.

O arquivo CSV é armazenado no MinIO (S3-compatible) e processado por um background job. O Analista acompanha o status do processamento em uma tela dedicada de "Uploads" dentro da captação.

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Importação de grandes volumes | Processar 10.000 linhas em menos de 5 minutos |
| Rastreabilidade de erros | 100% dos erros reportados com número da linha, coluna e mensagem descritiva |
| Agrupamento correto | Linhas com mesmo ISRC + mesmo horário consolidadas em uma única execução com quantidade acumulada |
| Identificação automática em lote | Mesmo comportamento da F02 — ISRC/ISWC válido → IDENTIFICADA, senão → PENDENTE |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Upload de CSV, acompanhar status, visualizar relatório de erros. Somente em captações ABERTAS que são suas |
| Consultor de Identificação | Visualizar uploads e relatórios. Sem permissão de upload |

---

## 4. Layout do CSV

### Especificação do Formato

- **Encoding:** UTF-8
- **Separador:** `;` (ponto-e-vírgula) — padrão brasileiro para evitar conflito com vírgulas em títulos
- **Header:** primeira linha obrigatória com nomes das colunas
- **Extensão:** `.csv`

### Colunas

| # | Coluna | Tipo | Obrigatória | Descrição |
|---|--------|------|-------------|-----------|
| 1 | `isrc` | Texto (12 chars) | Condicional | Código ISRC do fonograma. Obrigatório se `iswc` não informado |
| 2 | `iswc` | Texto | Condicional | Código ISWC da obra. Obrigatório se `isrc` não informado |
| 3 | `inicio` | Hora (`HH:mm:ss`) | Sim | Horário de início da execução no dia da captação |
| 4 | `fim` | Hora (`HH:mm:ss`) | Sim | Horário de fim. Deve ser posterior ao início |
| 5 | `tipo_utilizacao` | Texto (sigla) | Condicional | TA, TE, PE ou BK. Obrigatório se rubrica da captação exige classificação (RN-12) |
| 6 | `titulo_programa` | Texto (max 255) | Condicional | Título do programa/filme. Obrigatório se rubrica audiovisual |

> **Quantidade:** não é coluna. Derivada automaticamente do agrupamento — linhas com mesmo ISRC/ISWC + mesmo início/fim são consolidadas em uma execução com `quantidade = N`.

### Exemplo de CSV (rubrica TV Aberta — audiovisual)

```csv
isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa
BRUM71500001;;14:30:00;14:33:45;TA;Novela das 9 - Cap. 142
BRUM71500001;;14:30:00;14:33:45;TA;Novela das 9 - Cap. 142
BRUM71500002;;14:35:00;14:38:20;BK;Novela das 9 - Cap. 142
;T-345.246.800-1;15:00:00;15:04:10;PE;Show da Tarde
```

> Linhas 1 e 2 são idênticas → agrupadas em 1 execução com `quantidade = 2`.

### Exemplo de CSV (rubrica Rádio AM/FM — sem classificação)

```csv
isrc;iswc;inicio;fim;tipo_utilizacao;titulo_programa
BRUM71500001;;08:15:00;08:18:30;;
BRUM71500003;;08:20:00;08:23:15;;
```

> Colunas `tipo_utilizacao` e `titulo_programa` presentes no header mas vazias (aceito para rubricas não-audiovisuais).

---

## 5. Requisitos Funcionais

### RF-01 — Upload de arquivo CSV para MinIO

**Descrição:** O Analista seleciona um arquivo CSV e faz upload. O sistema armazena no MinIO e cria um registro de upload com status PROCESSANDO.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação ABERTA, analista é dono | Seleciona arquivo .csv e confirma upload | Arquivo armazenado no MinIO, registro de upload criado com status PROCESSANDO |
| 2 | Arquivo não é .csv | Tenta fazer upload | Sistema rejeita: "Formato inválido. Apenas arquivos .csv são aceitos" |
| 3 | Arquivo vazio ou sem header | Faz upload | Registro criado com status ERRO: "Arquivo vazio ou sem cabeçalho válido" |
| 4 | Captação FECHADA ou CANCELADA | Tenta upload | Ação não disponível (RN-04) |
| 5 | Analista NÃO é dono | Tenta upload | Ação não disponível (RN-08) |

**Regras aplicáveis:** RN-04, RN-08

**Prioridade:** Must Have

---

### RF-02 — Processamento assíncrono do CSV

**Descrição:** Um background job lê o CSV armazenado no MinIO, processa linha a linha, agrupa duplicatas, consulta o Cadastro para identificação automática e cria as execuções na captação.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Upload com status PROCESSANDO | Background job inicia | CSV é lido do MinIO, processado linha a linha |
| 2 | Processamento concluído sem erros | Job termina | Status → CONCLUIDO. Total de execuções criadas registrado |
| 3 | Processamento com erros em algumas linhas | Job termina | Status → CONCLUIDO_COM_ERROS. Linhas válidas processadas, erros registrados |
| 4 | Captação fechada/cancelada durante processamento | Job detecta mudança | Job interrompe, status → ERRO: "Captação não está mais aberta" |

**Prioridade:** Must Have

---

### RF-03 — Validação linha a linha com relatório de erros

**Descrição:** Cada linha do CSV é validada individualmente. Erros são registrados com número da linha, coluna com problema e mensagem descritiva. Linhas válidas são processadas normalmente.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Linha sem `isrc` nem `iswc` | Processamento | Erro: linha X, colunas `isrc`/`iswc`: "Ao menos um identificador (ISRC ou ISWC) é obrigatório" |
| 2 | `inicio` com formato inválido | Processamento | Erro: linha X, coluna `inicio`: "Formato de hora inválido. Esperado HH:mm:ss" |
| 3 | `fim` anterior a `inicio` | Processamento | Erro: linha X, coluna `fim`: "Horário de fim deve ser posterior ao início" |
| 4 | Rubrica audiovisual, `tipo_utilizacao` vazio | Processamento | Erro: linha X, coluna `tipo_utilizacao`: "Obrigatório para a rubrica TV Aberta" |
| 5 | Rubrica audiovisual, `titulo_programa` vazio | Processamento | Erro: linha X, coluna `titulo_programa`: "Obrigatório para a rubrica TV Aberta" |
| 6 | `tipo_utilizacao` com sigla desconhecida | Processamento | Erro: linha X, coluna `tipo_utilizacao`: "Valor inválido 'XX'. Valores aceitos: TA, TE, PE, BK" |
| 7 | Header com colunas faltando | Processamento | Erro global: "Colunas obrigatórias ausentes: [lista]" |

**Prioridade:** Must Have

---

### RF-04 — Agrupamento de linhas idênticas

**Descrição:** Linhas com mesmo ISRC/ISWC + mesmo horário (início e fim) são consolidadas em uma única execução com `quantidade` igual ao número de ocorrências.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | 3 linhas com mesmo ISRC `BRUM71500001` e horário `14:30:00-14:33:45` | Processamento | 1 execução criada com `quantidade = 3` |
| 2 | 2 linhas com mesmo ISRC, mesmo horário, mas tipo_utilizacao diferente | Processamento | Erro reportado: "ISRC BRUM71500001 na linha X tem tipo de utilização divergente da linha Y" — ambas ignoradas até correção |

**Regras aplicáveis:** RN-03

**Prioridade:** Must Have

---

### RF-05 — Detecção de ISRC duplicado com horários divergentes

**Descrição:** Se o mesmo ISRC/ISWC aparece com horários diferentes na mesma captação (mesmo dia, mesma fonte), a segunda ocorrência é ignorada e reportada como erro.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Linha 5: ISRC `BRUM71500001` horário `14:30:00-14:33:45`. Linha 20: mesmo ISRC horário `15:00:00-15:03:45` | Processamento | Linha 5 processada. Linha 20 reportada como erro: "ISRC BRUM71500001 já registrado com horário diferente (linha 5)" |

**Prioridade:** Must Have

---

### RF-06 — Identificação automática via Cadastro

**Descrição:** Para cada linha válida, o sistema consulta o Cadastro via HTTP (mesmo fluxo da F02). ISRC/ISWC com match → IDENTIFICADA, sem match → PENDENTE.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | ISRC encontrado no Cadastro com obra LIBERADA | Processamento | Execução criada com status IDENTIFICADA, título e intérpretes preenchidos do Cadastro |
| 2 | ISRC não encontrado no Cadastro | Processamento | Execução criada com status PENDENTE, título/intérpretes em branco |
| 3 | Cadastro API indisponível durante processamento | Timeout/erro | Execução criada com status PENDENTE (tolerância a falha) |

**Regras aplicáveis:** RN-02, RN-09

**Prioridade:** Must Have

---

### RF-07 — Tela de Uploads com status

**Descrição:** Seção "Uploads" na tela de detalhe da captação, listando todos os uploads realizados com seu status.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação com uploads | Analista acessa detalhe | Seção "Uploads" exibe tabela: data/hora do upload, nome do arquivo, status, total de linhas, criadas, erros |
| 2 | Upload com status PROCESSANDO | Tela aberta | Exibe indicador visual (spinner/badge) e atualiza via polling |
| 3 | Upload CONCLUIDO_COM_ERROS | Analista clica no upload | Expande/navega para relatório de erros detalhado |
| 4 | Captação sem uploads | Acessa detalhe | Seção exibe empty state |

**Prioridade:** Must Have

---

### RF-08 — Visualização do relatório de erros

**Descrição:** O relatório de erros mostra cada erro com número da linha, coluna afetada e mensagem, permitindo ao analista corrigir o CSV original e re-importar.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Upload com erros | Analista acessa relatório | Tabela com colunas: Linha, Coluna, Mensagem de Erro |
| 2 | Upload sem erros | Analista acessa relatório | Mensagem: "Todas as linhas foram processadas com sucesso" |
| 3 | Relatório com muitos erros (>50) | Analista acessa | Relatório paginado |

**Prioridade:** Must Have

---

### RF-09 — Validação de campos condicionais por rubrica

**Descrição:** As colunas `tipo_utilizacao` e `titulo_programa` são validadas conforme a rubrica da captação (mesmo comportamento da F02).

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação TV Aberta (audiovisual) | Linha sem `tipo_utilizacao` | Erro reportado na linha |
| 2 | Captação Rádio AM/FM (não-audiovisual) | Linha sem `tipo_utilizacao` | Aceito — campo não obrigatório |

**Regras aplicáveis:** RN-12

**Prioridade:** Must Have

---

## 6. Não-Objetivos (Fora de Escopo)

- **Re-upload parcial** (corrigir só linhas com erro) → analista corrige o CSV inteiro e re-importa
- **Preview antes de processar** → PoC processa direto após upload
- **Múltiplos formatos** (Excel, JSON, TSV) → apenas CSV (separador `;`)
- **Criação inline de obra/fonograma pendente via CSV** → apenas via formulário manual (F02). No CSV, ISRC/ISWC não encontrado resulta em execução PENDENTE
- **Download de template CSV** → documentar layout no frontend (tooltip ou link de ajuda)
- **Cancelamento de processamento em andamento** → PoC não suporta
- **Edição do CSV após upload** → analista corrige localmente e re-importa

---

## 7. Restrições Técnicas de Alto Nível

- **Armazenamento:** MinIO (S3-compatible) para persistência dos arquivos CSV
- **Processamento:** background job no serviço de Identificação (hosted service ou worker)
- **Volume:** até 10.000 linhas por arquivo na PoC
- **Encoding:** UTF-8 obrigatório
- **Separador:** `;` (ponto-e-vírgula)
- **Integração Cadastro:** mesma integração HTTP da F02 (CadastroHttpClient)
- **Auth:** mesmas roles — `analista-identificacao` (upload), `consultor-identificacao` (visualizar)

---

## 8. Riscos e Premissas

### Premissas
- MinIO será adicionado ao `docker-compose.dev.yml` como serviço de infraestrutura
- O CadastroHttpClient (F02) já existe e pode ser reutilizado pelo background job
- O formato CSV com separador `;` é o padrão das emissoras/fontes que alimentam o ECAD
- Linhas com erro não bloqueiam o processamento das linhas válidas restantes

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cadastro API lenta com 10.000 consultas sequenciais | Alta | Alto | Batch de consultas ao Cadastro (ex: buscar por lista de ISRCs) ou processar com paralelismo limitado |
| CSV com encoding diferente de UTF-8 (ex: ISO-8859-1) | Média | Médio | Detectar encoding ou rejeitar com mensagem clara |
| MinIO indisponível no momento do upload | Baixa | Alto | Retornar erro 503 ao frontend; MinIO com health check no docker-compose |
| Captação fechada por outro processo durante o processamento do CSV | Baixa | Médio | Background job verifica status da captação antes de persistir cada batch |

---

## 9. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação
- **Integração externa:** MinIO (S3-compatible), listada no mapa de integrações

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F03 — Upload de Execuções via CSV
- **Regras de negócio:** RN-02, RN-03, RN-04, RN-08, RN-09, RN-12
- **Entidades:** Execução, Tipo de Utilização
- **Questão resolvida:** "No CSV, uma linha representa uma execução única" — sim, quantidade derivada do agrupamento

---

## 10. Questões em Aberto

- [x] ~~Mesmo ISRC + mesmo horário + tipo_utilizacao divergente~~ → Resolvido: reportar como erro, ambas linhas ignoradas
- [x] ~~Persistência do relatório de erros~~ → Resolvido: TTL (ex: 30 dias), após isso descartado

Todas as questões foram resolvidas. PRD pronto para API Contract e TechSpec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o API Contract, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
