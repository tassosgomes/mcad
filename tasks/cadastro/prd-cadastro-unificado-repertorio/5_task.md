---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Criar a base da feature React e a ação de entrada da jornada

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (direta)
- [HU-02] Reutilizar titular existente (suporte)

## Requisitos

- RF-01, RF-05, RF-06 e RF-22: entrada da jornada, contrato de cliente e gate de permissão.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/repertorio/types/repertorio.ts`
  - `frontend/src/features/cadastro/repertorio/api/repertorioApi.ts`
  - `frontend/src/features/cadastro/repertorio/hooks/useCadastroRepertorio.ts`
  - `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.tsx`
  - `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.module.css`
  - `frontend/src/features/cadastro/repertorio/index.ts`
- **Modificar:**
  - `frontend/src/features/cadastro/index.tsx` (rota `repertorios/novo`)
  - `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` (ação gated `Novo Repertório`)
- **Referência:**
  - `frontend/src/shared/api/`
  - `frontend/src/shared/auth/`
  - páginas/hooks existentes de Obras
- **Skills:** react-architecture, react-code-quality, react-testing, react-observability, react-production-readiness.

## Subtarefas

- [ ] 5.1 Declarar tipos estritos para estado local, payloads, resposta e `ProblemDetails`; nunca usar `any`.
- [ ] 5.2 Criar cliente API para lookup e as duas mutações; distinguir `ISWC_INDISPONIVEL` de outros erros.
- [ ] 5.3 Criar hook com TanStack Query para mutações, invalidação de Obras/Fonogramas e preservação do estado local após `502`.
- [ ] 5.4 Adicionar rota e página contêiner; manter a feature acessível pela sua `index.ts`.
- [ ] 5.5 Adicionar a ação na listagem de Obras somente para `cadastro:default:repertorio:criar`.

## Sequenciamento

- Bloqueado por: 2.0; validar contra 4.0 quando a API estiver disponível.
- Desbloqueia: 6.0.
- Paralelizável: Sim, com a implementação do handler; usar MSW até os endpoints estarem prontos.

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-05, RF-06 e RF-22.
- Evidência esperada: rota, ação condicionada por permissão e hook com os três requests tipados.

## Detalhes de Implementação

Seguir o diretório feature-based já definido pelo inventário. O estado do wizard é local e não deve ser colocado em storage nem persistido: recarregar/fechar a aba o descarta. O hook deve oferecer explicitamente retry do POST principal e a ação pendente apenas depois da falha ISWC da sessão. Não enviar CPF/CNPJ, payload do wizard ou tokens à telemetria.

**Convenções da stack:** componentes funcionais, props e respostas tipadas, aliases, arquivos de hook em camelCase, componentes em PascalCase; UI com estados de loading/erro amigáveis; MSW para teste de API.

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` em `frontend/` passa.
- [ ] A rota `/cadastro/repertorios/novo` é registrada e a ação não é renderizada sem a permissão.
- [ ] O cliente suporta GET de lookup, POST normal e POST pendente, com erro ISWC tipado.
- [ ] Não há armazenamento de rascunho nem `any` nos arquivos da feature.
