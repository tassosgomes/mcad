---
status: blocked
parallelizable: false
blocked_by: []
---

<task_context>
<domain>engine/infra/seed-catalog</domain>
<type>configuration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>ecad-authz,seed-script</dependencies>
<unblocks>"2.0,3.0,4.0,5.0"</unblocks>
</task_context>

# Tarefa 1.0: Atualizar catálogo de permissões e perfis built-in nos seeds + re-seed em DEV

## Relacionada às User Stories

- [US-01] Diretor de Governança (irreversíveis só Gerente) — cobertura direta
- [US-02] Analista de Distribuição (mantém ultra-sensíveis) — cobertura direta
- [US-04] Gestor de Acessos (perfil dedicado) — cobertura direta
- [US-05] Auditor / Compliance Officer (Consultor de Acessos) — cobertura direta
- [US-07] Desenvolvedor (framework replicável) — cobertura direta

## Visão Geral

Materializar todo o catálogo built-in (framework de 4 níveis + Acessos + carve-out CPF Cadastro) nos arquivos `seeds/mcad/*.json` e aplicar via `scripts/seed-authz.sh` em DEV. Esta é a fundação de tudo: sem o catálogo correto no `ecad-authz`, os backends e o BFF não conseguem decidir corretamente.

A entrega é **idempotente** — o script `seed-authz.sh` é projetado para isso (PR para verificar). Em produção, a operação é não-destrutiva: só adiciona permissões/perfis e amplia o conjunto de Analistas existentes.

## Requisitos

- 9 permissões novas em `distribuicao.permissions.json` (categorias: Leitura, Ação sensível/UI, Trilha de auditoria).
- 1 permissão nova em `cadastro.permissions.json` (`titular:ver-cpf-completo`).
- 15 permissões em arquivo novo `acessos.permissions.json` (7 base + 8 escopadas: 2 por cada um dos 4 domínios).
- 4 perfis novos em `roles.json` (`distribuicao.default.operador`, `distribuicao.default.gerente`, `acessos.default.gestor`, `acessos.default.consultor`).
- Ampliação do `distribuicao.default.analista` com permissões UI/sensíveis + cross-domain `cadastro:default:titular:ver-cpf-completo`.
- Ampliação do `cadastro.default.analista` com `cadastro:default:titular:ver-cpf-completo`.
- Reclassificação das `description` das 9 permissões existentes de Distribuição (prefixo `[Categoria]`).
- 4 usuários de teste em `assignments.json`.
- Validação via dry-run + aplicação em DEV.

## Arquivos Envolvidos

- **Criar:**
  - `seeds/mcad/acessos.permissions.json`
- **Modificar:**
  - `seeds/mcad/distribuicao.permissions.json` — reclassificar `description` das 9 existentes + adicionar 9 NOVO
  - `seeds/mcad/cadastro.permissions.json` — adicionar `titular:ver-cpf-completo`
  - `seeds/mcad/roles.json` — adicionar 4 perfis novos + ampliar 2 perfis existentes (analista de Distribuição e de Cadastro)
  - `seeds/mcad/assignments.json` — adicionar 4 usuários de teste
- **Referência:**
  - `scripts/seed-authz.sh` (script idempotente que aplica todos os seeds)
  - `docs/migracao-authz/guia-operacional.md` (operação do seed)
  - `docs/adr/0002-permission-naming-convention.md` (convenção 4-segmentos)
  - `docs/adr/0006-perfis-built-in-rbac.md` (framework — fonte do mapeamento perfil×permissão)
  - `docs/adr/0007-dominio-acessos-segregado.md` (novo domínio `acessos`)
- **Skills para consultar:**
  - `common-roles-naming` — convenção de nomenclatura
  - `common-restful-api` — formato de chaves consistentes

## Subtarefas

- [ ] 1.1 Editar `seeds/mcad/distribuicao.permissions.json` — adicionar 9 entradas NOVO e reclassificar `description` das 9 existentes
- [ ] 1.2 Editar `seeds/mcad/cadastro.permissions.json` — adicionar `titular:ver-cpf-completo`
- [ ] 1.3 Criar `seeds/mcad/acessos.permissions.json` (15 permissões — service `acessos`, area `default` para base + areas `{dominio}` para escopadas)
- [ ] 1.4 Editar `seeds/mcad/roles.json` — adicionar 4 perfis novos e atualizar 2 perfis existentes
- [ ] 1.5 Editar `seeds/mcad/assignments.json` — adicionar 4 usuários de teste
- [ ] 1.6 Validar JSONs (`jq . seeds/mcad/*.json > /dev/null`) — todos válidos
- [ ] 1.7 Garantir que `scripts/seed-authz.sh` itera sobre `seeds/mcad/*.permissions.json` (deve achar `acessos.permissions.json` automaticamente; se não, adaptar)
- [ ] 1.8 Rodar dry-run: `./scripts/seed-authz.sh --dry-run` — output deve listar as criações esperadas
- [ ] 1.9 Aplicar em DEV: `./scripts/seed-authz.sh` — sem erros; usuário consegue logar como `gerente.dev` e ter as permissões esperadas via `/api/me/permissions`
- [ ] 1.10 Testes manuais via cURL: `curl -H "Authorization: Bearer $JWT" $BFF/api/me/permissions` para cada um dos novos usuários de teste

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0, 5.0
- Paralelizável: Não (única tarefa de fundação; outras dependem)

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03 (parcial — catálogo), RF-04, RF-06, RF-07 (carve-out)
- Evidência esperada: 5 arquivos seed válidos + dry-run output mostrando 25 novas permissões e 4 novos perfis + sessão DEV com os usuários de teste autenticando e tendo a lista esperada de permissões

## Detalhes de Implementação

### 1.1 — `seeds/mcad/distribuicao.permissions.json`

Adicionar (preservando entradas existentes, atualizar `version` para `1.1.0`):

```json
{ "key": "distribuicao:default:credito:listar", "displayName": "Listar créditos", "description": "[Leitura] Lista créditos de um processo de distribuição.", "resource": "credito", "action": "listar" },
{ "key": "distribuicao:default:credito:visualizar", "displayName": "Visualizar crédito", "description": "[Leitura] Detalhe de um crédito específico.", "resource": "credito", "action": "visualizar" },
{ "key": "distribuicao:default:processo:exportar", "displayName": "Exportar processo", "description": "[Ação sensível / UI] Exporta relatório consolidado do processo.", "resource": "processo", "action": "exportar" },
{ "key": "distribuicao:default:processo:ver-justificativa-cancelamento", "displayName": "Ver justificativa de cancelamento", "description": "[Ação sensível / UI] Exibe a justificativa textual de processos cancelados.", "resource": "processo", "action": "ver-justificativa-cancelamento" },
{ "key": "distribuicao:default:processo:recalcular-pos-calculado", "displayName": "Recalcular processo após CALCULADO", "description": "[Ação sensível / UI] Permite recalcular um processo que já está em estado CALCULADO. Operação excepcional.", "resource": "processo", "action": "recalcular-pos-calculado" },
{ "key": "distribuicao:default:credito-retido:liberar-manual", "displayName": "Liberar crédito retido manualmente", "description": "[Ação sensível / UI] Força liberação de crédito retido fora do fluxo normal de distribuição.", "resource": "credito-retido", "action": "liberar-manual" },
{ "key": "distribuicao:default:processo:ver-historico-alteracoes", "displayName": "Ver histórico de alterações do processo", "description": "[Trilha de auditoria] Acesso ao timeline do ecad-auditoria para um processo.", "resource": "processo", "action": "ver-historico-alteracoes" },
{ "key": "distribuicao:default:credito:ver-historico-alteracoes", "displayName": "Ver histórico de alterações de crédito", "description": "[Trilha de auditoria] Acesso ao timeline do ecad-auditoria para um crédito.", "resource": "credito", "action": "ver-historico-alteracoes" },
{ "key": "distribuicao:default:demonstrativo:visualizar", "displayName": "Visualizar demonstrativo", "description": "[Leitura] Visualiza demonstrativo por titular (depende de F07).", "resource": "demonstrativo", "action": "visualizar" },
{ "key": "distribuicao:default:demonstrativo:exportar", "displayName": "Exportar demonstrativo", "description": "[Ação sensível / UI] Exporta demonstrativo por titular (depende de F07).", "resource": "demonstrativo", "action": "exportar" }
```

Reclassificar `description` das 9 existentes adicionando prefixo de categoria:
- `rubrica:listar`, `rubrica:visualizar`, `processo:listar`, `processo:visualizar` → `[Leitura]`
- `processo:criar`, `processo:calcular` → `[Operação reversível]`
- `processo:aprovar`, `processo:finalizar`, `processo:cancelar` → `[Decisão de status]` (cite irreversível em finalizar/cancelar)

### 1.2 — `seeds/mcad/cadastro.permissions.json`

Adicionar 1 entrada:

```json
{ "key": "cadastro:default:titular:ver-cpf-completo", "displayName": "Ver CPF completo do titular", "description": "[Ação sensível / UI] Permite ver CPF/CNPJ completo (sem mascaramento) na resposta de Titular. Requisito LGPD.", "resource": "titular", "action": "ver-cpf-completo" }
```

### 1.3 — `seeds/mcad/acessos.permissions.json` (NOVO)

```json
{
  "service": "bff",
  "domain": "acessos",
  "area": "default",
  "version": "1.0.0",
  "permissions": [
    { "key": "acessos:default:papel:listar", "displayName": "Listar perfis built-in", "description": "[Leitura] Lista catálogo de perfis built-in (todos os domínios).", "resource": "papel", "action": "listar" },
    { "key": "acessos:default:papel:visualizar", "displayName": "Visualizar perfil", "description": "[Leitura] Visualiza description, displayName e permissionKeys de um perfil built-in.", "resource": "papel", "action": "visualizar" },
    { "key": "acessos:default:usuario:listar", "displayName": "Listar usuários", "description": "[Leitura] Lista usuários do ecad-authz (busca por email/subject).", "resource": "usuario", "action": "listar" },
    { "key": "acessos:default:usuario:visualizar-papeis-completo", "displayName": "Visualizar papéis de um usuário (todos os domínios)", "description": "[Leitura] Vê todos os papéis de um usuário em todos os domínios.", "resource": "usuario", "action": "visualizar-papeis-completo" },
    { "key": "acessos:default:papel:atribuir", "displayName": "Atribuir papel a usuário", "description": "[Operação reversível] Atribui um perfil built-in a um usuário.", "resource": "papel", "action": "atribuir" },
    { "key": "acessos:default:papel:remover", "displayName": "Remover papel de usuário", "description": "[Operação reversível] Remove um perfil built-in de um usuário.", "resource": "papel", "action": "remover" },
    { "key": "acessos:default:atribuicao:ver-historico", "displayName": "Ver histórico global de atribuições", "description": "[Trilha de auditoria] Lista o histórico global de atribuições/remoções (cross-domain).", "resource": "atribuicao", "action": "ver-historico" },

    { "key": "acessos:cadastro:papel:visualizar", "displayName": "Ver papéis (escopo Cadastro)", "description": "[Leitura] Vê assignments envolvendo papéis do domínio Cadastro.", "resource": "papel", "action": "visualizar" },
    { "key": "acessos:cadastro:atribuicao:ver-historico", "displayName": "Histórico de atribuições (escopo Cadastro)", "description": "[Trilha de auditoria] Vê histórico de atribuições escopado a Cadastro.", "resource": "atribuicao", "action": "ver-historico" },
    { "key": "acessos:identificacao:papel:visualizar", "displayName": "Ver papéis (escopo Identificação)", "description": "[Leitura] Vê assignments envolvendo papéis do domínio Identificação.", "resource": "papel", "action": "visualizar" },
    { "key": "acessos:identificacao:atribuicao:ver-historico", "displayName": "Histórico de atribuições (escopo Identificação)", "description": "[Trilha de auditoria] Vê histórico escopado a Identificação.", "resource": "atribuicao", "action": "ver-historico" },
    { "key": "acessos:arrecadacao:papel:visualizar", "displayName": "Ver papéis (escopo Arrecadação)", "description": "[Leitura] Vê assignments envolvendo papéis do domínio Arrecadação.", "resource": "papel", "action": "visualizar" },
    { "key": "acessos:arrecadacao:atribuicao:ver-historico", "displayName": "Histórico de atribuições (escopo Arrecadação)", "description": "[Trilha de auditoria] Vê histórico escopado a Arrecadação.", "resource": "atribuicao", "action": "ver-historico" },
    { "key": "acessos:distribuicao:papel:visualizar", "displayName": "Ver papéis (escopo Distribuição)", "description": "[Leitura] Vê assignments envolvendo papéis do domínio Distribuição.", "resource": "papel", "action": "visualizar" },
    { "key": "acessos:distribuicao:atribuicao:ver-historico", "displayName": "Histórico de atribuições (escopo Distribuição)", "description": "[Trilha de auditoria] Vê histórico escopado a Distribuição.", "resource": "atribuicao", "action": "ver-historico" }
  ]
}
```

> **Nota sobre o domínio `acessos` com múltiplas areas:** o catálogo permite o uso de `default` + nomes de domínios de negócio como `area`. O script de seed deve aceitar isso (verificar e adaptar se necessário). Caso o script atual filtre por `area=default`, o ajuste é uma das subtarefas.

### 1.4 — `seeds/mcad/roles.json`

Adicionar 4 perfis e atualizar 2 existentes. Trechos relevantes (preservar formato existente):

```jsonc
// NOVO: distribuicao.default.operador
{
  "key": "distribuicao.default.operador",
  "displayName": "Operador Distribuição",
  "description": "[Built-in] Operações reversíveis em Distribuição: criar e calcular processos. Não decide status nem audita.",
  "domain": "distribuicao",
  "area": "default",
  "permissionKeys": [
    "distribuicao:default:rubrica:listar",
    "distribuicao:default:rubrica:visualizar",
    "distribuicao:default:processo:listar",
    "distribuicao:default:processo:visualizar",
    "distribuicao:default:credito:listar",
    "distribuicao:default:credito:visualizar",
    "distribuicao:default:processo:criar",
    "distribuicao:default:processo:calcular"
  ]
}

// NOVO: distribuicao.default.gerente
{
  "key": "distribuicao.default.gerente",
  "displayName": "Gerente Distribuição",
  "description": "[Built-in] Governança e auditoria de Distribuição: aprovar, finalizar, cancelar, ver histórico de alterações, ver assignments escopados.",
  "domain": "distribuicao",
  "area": "default",
  "permissionKeys": [
    "distribuicao:default:rubrica:listar",
    "distribuicao:default:rubrica:visualizar",
    "distribuicao:default:processo:listar",
    "distribuicao:default:processo:visualizar",
    "distribuicao:default:credito:listar",
    "distribuicao:default:credito:visualizar",
    "distribuicao:default:processo:aprovar",
    "distribuicao:default:processo:finalizar",
    "distribuicao:default:processo:cancelar",
    "distribuicao:default:processo:exportar",
    "distribuicao:default:processo:ver-justificativa-cancelamento",
    "distribuicao:default:processo:ver-historico-alteracoes",
    "distribuicao:default:credito:ver-historico-alteracoes",
    "distribuicao:default:demonstrativo:visualizar",
    "distribuicao:default:demonstrativo:exportar",
    "cadastro:default:titular:ver-cpf-completo",
    "acessos:distribuicao:papel:visualizar",
    "acessos:distribuicao:atribuicao:ver-historico"
  ]
}

// AMPLIAR: distribuicao.default.analista
// Lista de permissões passa a incluir as novas reversíveis + ultra-sensíveis (mas NÃO trilha de auditoria nem acessos:*)
// Adicionar:
//   "distribuicao:default:credito:listar",
//   "distribuicao:default:credito:visualizar",
//   "distribuicao:default:credito-retido:liberar-manual",
//   "distribuicao:default:processo:recalcular-pos-calculado",
//   "distribuicao:default:demonstrativo:visualizar",
//   "cadastro:default:titular:ver-cpf-completo"

// AMPLIAR: cadastro.default.analista
// Adicionar uma única permissão: "cadastro:default:titular:ver-cpf-completo"

// NOVO: acessos.default.gestor
{
  "key": "acessos.default.gestor",
  "displayName": "Gestor de Acessos",
  "description": "[Built-in] Único caminho recomendado para atribuir e remover papéis de usuários. Cross-domain.",
  "domain": "acessos",
  "area": "default",
  "permissionKeys": [
    "acessos:default:papel:listar",
    "acessos:default:papel:visualizar",
    "acessos:default:usuario:listar",
    "acessos:default:usuario:visualizar-papeis-completo",
    "acessos:default:papel:atribuir",
    "acessos:default:papel:remover",
    "acessos:default:atribuicao:ver-historico"
  ]
}

// NOVO: acessos.default.consultor
{
  "key": "acessos.default.consultor",
  "displayName": "Consultor de Acessos",
  "description": "[Built-in] Auditor / Compliance Officer read-only de assignments. Sem poder de escrita.",
  "domain": "acessos",
  "area": "default",
  "permissionKeys": [
    "acessos:default:papel:listar",
    "acessos:default:papel:visualizar",
    "acessos:default:usuario:listar",
    "acessos:default:usuario:visualizar-papeis-completo",
    "acessos:default:atribuicao:ver-historico"
  ]
}
```

### 1.5 — `seeds/mcad/assignments.json`

Adicionar 4 usuários de teste (preservando os 3 existentes):

```json
{
  "email": "operador.dev@mcad.local",
  "name": "Operador Dev",
  "subjectHint": "operador.dev",
  "roleKeys": ["distribuicao.default.operador"]
},
{
  "email": "gerente.dev@mcad.local",
  "name": "Gerente Dev",
  "subjectHint": "gerente.dev",
  "roleKeys": ["distribuicao.default.gerente"]
},
{
  "email": "gestor-acessos.dev@mcad.local",
  "name": "Gestor de Acessos Dev",
  "subjectHint": "gestor-acessos.dev",
  "roleKeys": ["acessos.default.gestor"]
},
{
  "email": "consultor-acessos.dev@mcad.local",
  "name": "Consultor de Acessos Dev",
  "subjectHint": "consultor-acessos.dev",
  "roleKeys": ["acessos.default.consultor"]
}
```

> **Pré-requisito:** esses usuários precisam existir no IdP (Logto) antes do seed conseguir associar — caso contrário o script loga `⚠️` e pula (comportamento existente). Tasso provisiona no IdP.

**Convenções da stack (das skills consultadas):**

- Naming 4-segmentos preservado em todas as chaves (ADR 0002).
- `displayName` em pt-BR consistente com `roles.json` existente.
- JSON validado com `jq`.
- Re-seed idempotente — `scripts/seed-authz.sh` aceita execução repetida sem efeitos colaterais.

## Critérios de Sucesso (Verificáveis)

- [ ] `jq . seeds/mcad/distribuicao.permissions.json seeds/mcad/cadastro.permissions.json seeds/mcad/acessos.permissions.json seeds/mcad/roles.json seeds/mcad/assignments.json > /dev/null` retorna 0 (todos válidos)
- [ ] `./scripts/seed-authz.sh --dry-run` em DEV roda sem erro e mostra:
  - 9 permissões a criar em `distribuicao`
  - 1 permissão a criar em `cadastro`
  - 15 permissões a criar em `acessos`
  - 4 papéis a criar (`distribuicao.default.operador`, `distribuicao.default.gerente`, `acessos.default.gestor`, `acessos.default.consultor`)
  - 2 papéis a atualizar (`distribuicao.default.analista`, `cadastro.default.analista`)
- [ ] `./scripts/seed-authz.sh` em DEV roda sem erro (sai com exit code 0)
- [ ] `curl -sH "Authorization: Bearer $JWT_GERENTE_DEV" $BFF/api/me/permissions | jq '.permissions | length'` retorna ≥ 18 (todas as do perfil Gerente)
- [ ] `curl -sH "Authorization: Bearer $JWT_OPERADOR_DEV" $BFF/api/me/permissions | jq '.permissions | sort'` lista as 8 permissões esperadas do Operador
- [ ] `curl -sH "Authorization: Bearer $JWT_GESTOR_ACESSOS_DEV" $BFF/api/me/permissions | jq '.permissions | length'` retorna 7
- [ ] `curl -sH "Authorization: Bearer $JWT_CONSULTOR_ACESSOS_DEV" $BFF/api/me/permissions | jq '.permissions | length'` retorna 5
- [ ] Re-execução do `./scripts/seed-authz.sh` produz zero diferenças (idempotência confirmada)
