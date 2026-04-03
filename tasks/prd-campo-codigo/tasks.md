# Resumo de Tarefas — Campo Código

## Visão Geral

Adição do campo `codigo` (BIGINT sequencial) em 4 entidades. Feature retroativa: modifica entidades, configurations, migration, responses, handlers, filtros, endpoints, tabelas, page headers, banners e filtros frontend. São 7 tarefas em 2 lanes.

## Tarefas

### Lane A — Backend
- [ ] 1.0 Domain + Infra: Entidades (+Codigo), Configurations (+sequence+unique), Migration, Seed (+códigos 1-7)
- [ ] 2.0 Application: Responses (+Codigo), Handlers (mapeamento), Filtros (+Codigo)
- [ ] 3.0 API: Endpoints (+query param codigo) + Testes

### Lane B — Frontend
- [ ] 4.0 Types (+codigo) + API (+query param) + Filtros (+campo Código)
- [ ] 5.0 Tabelas: Código como primeira coluna (6 tabelas)
- [ ] 6.0 PageHeaders + Banners Depuração (código em vez de UUID)
- [ ] 7.0 Validação E2E
