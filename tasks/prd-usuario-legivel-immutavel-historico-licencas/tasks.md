# Resumo de Tarefas de Implementacao - Usuario legivel e imutavel nos historicos da Arrecadacao

## Visao Geral

Este plano transforma o PRD e a Tech Spec em tarefas executaveis para implementar snapshots imutaveis de ator nos novos historicos da Arrecadacao. A entrega adiciona campos nullable no banco, centraliza a resolucao do usuario autenticado, persiste `subject` e rotulo humano congelado no momento da escrita, enriquece leituras com status atual conhecido pela projecao `arrecadacao.usuarios_identidade` e atualiza a UI React para exibir `Nome (login)` com indicacao de usuario suspenso/removido quando aplicavel.

## Fontes Consultadas

| Fonte | Influencia |
|-------|------------|
| `prd.md` | Objetivos, user stories, fallbacks de exibicao, compatibilidade com historicos antigos e nao-objetivos |
| `techspec.md` | Migration V14, records/interfaces, endpoints afetados, sequenciamento tecnico, riscos e abordagem de testes |
| Codigo local `services/arrecadacao-api` | Entidades, commands, controllers, projection repository e DTOs existentes |
| Codigo local `frontend/src/features/arrecadacao` | Tipos, timelines, paginas de UDA e Pagamento afetadas |

## Fases de Implementacao

### Fase 1 - Fundacao Backend (Tasks 1.0-3.0)

Cria a base persistente e os contratos compartilhados de ator. A task 1.0 estabiliza o schema e entidades; a task 2.0 cria os models/resolvers e lookup da projecao; a task 3.0 centraliza a leitura do usuario autenticado na API e altera commands para carregar `ActorSnapshot`.

### Fase 2 - Superficies de Escrita e Leitura (Tasks 4.0-6.0)

Aplica o modelo em tres trilhas paralelas: Licencas, Usuarios de Musica e UDA/Pagamento. Cada trilha grava snapshot em novos registros, mantem campos legados e retorna DTOs enriquecidos sem quebrar consumidores.

### Fase 3 - Frontend e Validacao (Tasks 7.0-9.0)

Atualiza tipos e cria `ActorDisplay`, aplica o componente nas telas de Arrecadacao e consolida testes de integracao/contrato, observabilidade e checklist final.

## Tarefas

- [X] 1.0 Migration V14 e campos de ator historico no dominio
- [ ] 2.0 Modelos, ports e resolucao de exibicao de ator na Application/Infra
- [ ] 3.0 `CurrentActorResolver` na API e comandos com `ActorSnapshot`
- [ ] 4.0 Licencas: gravacao e leitura enriquecida do historico de status
- [ ] 5.0 Usuarios de Musica: gravacao e leitura enriquecida do historico de status
- [ ] 6.0 UDA e Pagamento/Estorno: snapshots de criacao/estorno e DTOs enriquecidos
- [ ] 7.0 Frontend: tipos de ator e componente compartilhado `ActorDisplay`
- [ ] 8.0 Frontend: aplicar `ActorDisplay` nas telas de Arrecadacao afetadas
- [ ] 9.0 Testes integrados, contrato, observabilidade e validacao final

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| HU-01 Analista ve quem executou mudancas com nome e login | 2.0, 4.0, 5.0, 6.0, 7.0, 8.0 | Direta |
| HU-02 Consultor nao interpreta GUIDs ou identificadores tecnicos | 2.0, 4.0, 5.0, 6.0, 8.0 | Direta |
| HU-03 Auditor/PO tem identidade imutavel no historico | 1.0, 3.0, 4.0, 5.0, 6.0 | Direta |
| HU-04 Operacao nao e bloqueada por sincronizacao atrasada | 2.0, 3.0, 4.0, 5.0, 6.0, 9.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| Novos historicos armazenam identificador imutavel do ator | 1.0, 3.0, 4.0, 5.0, 6.0 | Planejado |
| Novos historicos armazenam rotulo humano congelado | 2.0, 3.0, 4.0, 5.0, 6.0 | Planejado |
| Fallback `Nome (login)` -> login -> e-mail -> identificador tecnico | 2.0, 9.0 | Planejado |
| Status atual `ATIVO/SUSPENSO/REMOVIDO/DESCONHECIDO` via `usuarios_identidade` | 2.0, 4.0, 5.0, 6.0, 8.0 | Planejado |
| Historicos antigos seguem exibindo valor legado | 2.0, 4.0, 5.0, 6.0, 9.0 | Planejado |
| Nenhuma chamada sincrona ao IdP em leitura | 2.0, 9.0 | Planejado |
| Campos legados `autor`, `criadoPor`, `estornadoPor` mantidos | 4.0, 5.0, 6.0 | Planejado |
| UI legivel em desktop/mobile e acessivel por texto visivel | 7.0, 8.0 | Planejado |

### Artefatos da TechSpec

| Artefato | Task | Status |
|----------|------|--------|
| `V14__add_actor_snapshot_to_arrecadacao_history.sql` | 1.0 | Coberto |
| `ActorSnapshot` | 2.0 | Coberto |
| `IdentityUserLookup` | 2.0 | Coberto |
| `IdentityUserProjection` | 2.0 | Coberto |
| `ActorDisplayResolver` | 2.0 | Coberto |
| `ActorDisplayResponse` | 2.0 | Coberto |
| Adapter JDBC sobre `arrecadacao.usuarios_identidade` | 2.0 | Coberto |
| `CurrentActorResolver` | 3.0 | Coberto |
| Commands de Licenca/Usuario/UDA/Pagamento com snapshot | 3.0, 4.0, 5.0, 6.0 | Coberto |
| DTOs REST enriquecidos | 4.0, 5.0, 6.0 | Coberto |
| Tipos TypeScript e `ActorDisplay` | 7.0 | Coberto |
| Aplicacao em Licencas, Usuarios, UDA e Pagamento | 8.0 | Coberto |

### Categorias Obrigatorias

| # | Categoria | Task(s) | Status |
|---|-----------|---------|--------|
| 1 | Setup / Configuracao | 1.0 (Flyway V14), 9.0 (validacao final) | Planejado |
| 2 | Modelos de Dados | 1.0, 2.0, 7.0 | Planejado |
| 3 | Logica de Negocio | 2.0, 4.0, 5.0, 6.0 | Planejado |
| 4 | Endpoints / Interfaces | 3.0, 4.0, 5.0, 6.0 | Planejado |
| 5 | Integracoes Externas | 2.0 (reuso da projecao local de identity-sync) | Planejado |
| 6 | Validacoes e Erros | 2.0, 3.0, 9.0 | Planejado |
| 7 | Testes | Subtarefas em todas as tasks; consolidacao em 9.0 | Planejado |
| 8 | Observabilidade | 2.0, 3.0, 9.0 | Planejado |
| 9 | Documentacao | 9.0 | Planejado |
| 10 | Seguranca | 3.0, 9.0 | Planejado |

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane A - Fundacao persistente | 1.0 | Schema e entidades precisam existir antes das trilhas de dominio |
| Lane B - Resolucao de ator | 2.0 -> 3.0 | Models, lookup e extracao centralizada do usuario autenticado |
| Lane C - Licencas | 4.0 | Pode rodar em paralelo com 5.0 e 6.0 apos 1.0-3.0 |
| Lane D - Usuarios de Musica | 5.0 | Pode rodar em paralelo com 4.0 e 6.0 apos 1.0-3.0 |
| Lane E - UDA/Pagamento | 6.0 | Pode rodar em paralelo com 4.0 e 5.0 apos 1.0-3.0 |
| Lane F - Frontend base | 7.0 | Pode iniciar quando o contrato `ActorDisplayResponse` estiver definido |
| Lane G - Frontend telas | 8.0 | Depende de 7.0 e dos DTOs enriquecidos das superficies afetadas |
| Lane H - Validacao final | 9.0 | Consolida testes e riscos apos backend e frontend |

### Caminho Critico

`1.0 -> 2.0 -> 3.0 -> (4.0, 5.0, 6.0) -> 8.0 -> 9.0`

### Diagrama de Dependencias

```text
1.0 (migration + entidades)
 |
 +--> 2.0 (models/ports/resolver)
       |
       +--> 3.0 (CurrentActorResolver + commands)
             |
             +--> 4.0 (Licencas)
             +--> 5.0 (Usuarios de Musica)
             +--> 6.0 (UDA + Pagamento)
             |
             +--> 7.0 (ActorDisplay + tipos)
                    |
                    +--> 8.0 (telas)

(4.0 + 5.0 + 6.0 + 8.0) --> 9.0 (validacao final)
```

## Proximo Passo

Executar as tarefas em ordem, priorizando 1.0-3.0 como fundacao. Depois disso, 4.0, 5.0 e 6.0 podem ser distribuidas para agentes diferentes; 7.0 pode iniciar assim que o contrato de ator estiver definido.
