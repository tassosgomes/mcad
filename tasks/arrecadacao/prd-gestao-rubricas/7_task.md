---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0"]
---

<task_context>
<domain>cross-domain/validation</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>full_stack</dependencies>
<unblocks>[]</unblocks>
</task_context>

# Tarefa 7.0: Validação Cross-Domain e Finalização

## Visão Geral

Validar o fluxo end-to-end completo: criação de rubrica na Arrecadação, sincronização com Distribuição, inativação impedindo licenças/pagamentos, e reativação restaurando permissões.

## Requisitos

- Fluxo E2E validado manualmente ou via teste automatizado
- Build passando em todos os serviços
- Code review e conformidade com padrões do projeto

## Subtarefas

- [ ] 7.1 Validar fluxo de criação e sincronização
  1. Criar rubrica na Arrecadação via frontend ou cURL
  2. Verificar evento na tabela `arrecadacao.outbox_events`
  3. Verificar que Distribuição consumiu e sincronizou (`distribuicao.rubricas`)
  4. Verificar que frontend de Distribuição mostra a nova rubrica
  
- [ ] 7.2 Validar inativação e bloqueios
  1. Inativar rubrica na Arrecadação
  2. Tentar criar licença → deve retornar 422
  3. Tentar registrar pagamento → deve retornar 422
  4. Verificar que verbas e pagamentos existentes permanecem intactos
  5. Verificar que Distribuição sincronizou inativação
  
- [ ] 7.3 Validar reativação
  1. Reativar rubrica na Arrecadação
  2. Criar licença → deve permitir
  3. Verificar que Distribuição sincronizou reativação
  
- [ ] 7.4 Executar build completo
  - `mvn clean test` em `services/arrecadacao-api`
  - `mvn clean test` em `services/distribuicao-api`
  - `npm run build` em `frontend`
  
- [ ] 7.5 Revisar code quality
  - Verificar naming conventions (camelCase, PascalCase)
  - Verificar tamanho de métodos (< 50 linhas preferencial)
  - Verificar tratamento de erros (ProblemDetails)
  - Verificar que não há `any` no TypeScript
  
- [ ] 7.6 Atualizar documentação (se necessário)
  - `AGENTS.md` se houver mudanças em convenções
  - `CLAUDE.md` se houver novos comandos de build

## Detalhes de Implementação

### Script de Validação Manual (bash)

```bash
#!/bin/bash
# validate-rubricas.sh

BASE_URL="http://localhost:5003/api/v1"
TOKEN="Bearer $(get_token)"

# 1. Criar rubrica
echo "=== Criando rubrica ==="
RUBRICA=$(curl -s -X POST "$BASE_URL/rubricas" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Podcast","exigeClassificacao":false}' | jq -r '.id')

# 2. Inativar
echo "=== Inativando rubrica ==="
curl -s -X POST "$BASE_URL/rubricas/$RUBRICA/inativar" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"justificativa":"Segmento não utilizado no momento"}' | jq

# 3. Verificar que licença é bloqueada
echo "=== Tentando criar licença (deve falhar 422) ==="
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/licencas" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"usuarioMusicaId\":\"...\",\"rubricaId\":\"$RUBRICA\",\"dataInicio\":\"2026-06-07\"}"

# 4. Reativar
echo "=== Reativando rubrica ==="
curl -s -X POST "$BASE_URL/rubricas/$RUBRICA/ativar" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"justificativa":"Segmento retomado"}' | jq
```

## Critérios de Sucesso

- [ ] Build passa sem erros em todos os serviços
- [ ] Testes E2E validam fluxo completo de criação → sincronização → inativação → bloqueio → reativação
- [ ] Frontend permite todas as operações de CRUD
- [ ] Distribuição sincroniza `ativo` corretamente
- [ ] Code review aprovado (conformidade com padrões)
- [ ] Documentação atualizada

## Checklist de Entrega

- [ ] PRD revisado e aprovado
- [ ] TechSpec implementada conforme especificado
- [ ] Tasks 1.0 a 7.0 completadas
- [ ] Testes passando
- [ ] Feature funcionando em ambiente local
