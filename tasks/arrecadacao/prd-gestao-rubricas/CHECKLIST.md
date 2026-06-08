# Checklist de Entrega — F06: Gestão de Rubricas

## Backend — Arrecadação
- [x] Migration `ativo` na tabela `rubricas`
- [x] Entidade `Rubrica` com campo `ativo` e métodos `ativar()`/`inativar()`
- [x] `RubricaRepository` expandido com `save()` e `existsBySigla()`
- [x] `SiglaSuggester` com algoritmo de geração automática
- [x] Commands + Handlers (Criar, Atualizar, Inativar, Ativar)
- [x] DTOs (Request e Response)
- [x] Evento Outbox `arrecadacao.rubrica.atualizada` em toda mutação
- [x] 6 endpoints REST no `RubricaController`
- [x] 4 permissões dedicadas em `permissions.yaml`
- [x] Validação de rubrica ativa em criação de Licença
- [x] Validação de rubrica ativa em registro de Pagamento
- [x] Testes unitários (178 passando, 0 falhas)

## Backend — Distribuição
- [x] Migration `ativo` no schema `distribuicao`
- [x] Entidade `Rubrica` com campo `ativo`
- [x] `RubricaEventPayload` com campo `ativo`
- [x] `RubricaEventHandler` sincroniza `ativo`

## Frontend
- [x] Types, API client, Hooks
- [x] Components (Table, Form, Modal)
- [x] Pages (Listagem, Criação, Edição)
- [x] Rotas no `features/arrecadacao/index.tsx`
- [x] Sidebar atualizada
- [x] Build passa (`npm run build`)

## Testes
- [x] SiglaSuggester (8 testes)
- [x] Command Handlers (11 testes)
- [x] Rubrica Endpoints Integration (10 cenários)
- [x] Validação de rubrica inativa (2 testes)
- [x] Eventos Outbox (4 testes)
