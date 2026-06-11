# Template de Especificação Técnica

## Resumo Executivo

Esta entrega fecha o ciclo de vida administrativo de permissões do módulo de Autorização sem criar um backend de domínio novo no MCAD. A solução reaproveita o `ecad-authz` como fonte autoritativa do catálogo, o proxy já existente `/api/authz/v1/*` para consultas simples, e introduz no BFF um conjunto pequeno de rotas próprias para as operações que exigem regra adicional de negócio, agregação de dados e trilha de auditoria governada. A OpenAPI do `ecad-authz` já cobre consulta de catálogo, depreciação e inspeção da composição de papéis; criação, reativação e remoção lógica de permissão ainda não existem como endpoints administrativos e passam a ser dependências explícitas de evolução do upstream.

O ponto principal de arquitetura é separar leitura bruta de catálogo de operações administrativas governadas. Listagem, detalhe e depreciação da permissão continuam próximos do contrato já existente do `ecad-authz`; criação, reativação e remoção exigem extensão contratual no upstream antes da implementação fim a fim. A tela de detalhe da permissão também deixa de ser apenas um espelho do catálogo e passa a agregar vínculos com papéis, elegibilidade de remoção e estados de transição. A implementação assume o padrão de naming `dominio:area:recurso:acao` do ADR 0002 e mantém o princípio do ADR 0003: o frontend só conduz UX; a decisão final de autorização e consistência permanece server-side.

O contrato local consolidado desta feature fica documentado em `tasks/prd-gestao-ciclo-vida-permissoes/authz-contract.md`, incluindo capability matrix, mapeamento `DISABLED -> Removida`, erro fail-closed para operações sem endpoint upstream e recorte de Fase 1/Fase 2.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- `frontend/src/features/authz/*` continua sendo o módulo de UI de catálogo e administração de permissões.
- `services/bff/src` recebe novas rotas próprias para o ciclo de vida de permissões, ao lado do proxy já existente para o `ecad-authz`.
- `ecad-authz` permanece como sistema de registro do catálogo e dos vínculos `role -> permission`.
- `ecad-auditoria` recebe eventos publicados pelo BFF para cadastro, depreciação, reativação, remoção e tentativas negadas.

Fluxo resumido:

1. A listagem e o carregamento básico de detalhe continuam usando `GET /api/authz/v1/permissions` e `GET /api/authz/v1/permissions/{id}`.
2. A tela de detalhe chama um endpoint novo do BFF para obter papéis vinculados e elegibilidade de remoção.
3. As ações de criar, depreciar, reativar e remover chamam rotas novas do BFF.
4. O BFF resolve o `authorization-context`, aplica validações locais adicionais, chama o `ecad-authz`, publica o evento de auditoria e devolve resposta normalizada ao frontend.

## Design de Implementação

### Interfaces Principais

```ts
// services/bff/src/authzPermissionLifecycleRoutes.ts
export interface PermissionLifecycleService {
  createPermission(token: string, input: CreatePermissionInput): Promise<PermissionDto>;
  deprecatePermission(token: string, permissionId: string): Promise<PermissionDto>;
  reactivatePermission(token: string, permissionId: string): Promise<PermissionDto>;
  removePermission(token: string, permissionId: string, confirmationText: string): Promise<PermissionDto>;
  listLinkedRoles(token: string, permissionId: string): Promise<LinkedRoleDto[]>;
}
```

```ts
// frontend/src/features/authz/api/authzPermissionLifecycleApi.ts
export interface CreatePermissionInput {
  key: string;
  displayName: string;
  description?: string | null;
  domain: string;
  area: string;
  resource: string;
  action: string;
}
```

```ts
// frontend/src/features/authz/types/permission.ts
export type PermissionStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED';

export interface LinkedRole {
  id: string;
  key: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE';
}
```

O BFF novo não substitui o proxy genérico; ele encapsula apenas os casos governados. As rotas propostas são:

- `POST /api/autorizacao/permissoes`
- `POST /api/autorizacao/permissoes/:id/depreciar`
- `POST /api/autorizacao/permissoes/:id/reativar`
- `POST /api/autorizacao/permissoes/:id/remover`
- `GET /api/autorizacao/permissoes/:id/papeis-vinculados`

No frontend, `authzPermissionsApi.ts` continua responsável por listagem/detalhe. Um novo `authzPermissionLifecycleApi.ts` concentra mutações e vínculo de papéis, com `React Query` seguindo o padrão já usado em `usePermissionsCatalog` e `useRolesCatalog`. Destas rotas, apenas `depreciar` e `papeis-vinculados` podem ser implementadas imediatamente com o contrato atual do upstream; as demais ficam condicionadas à evolução da API AuthZ.

### Modelos de Dados

- `Permission` atual deve aceitar o enum oficial do upstream: `ACTIVE | DEPRECATED | DISABLED`.
- Para aderir ao PRD sem divergir do contrato real, a UI deve apresentar `DISABLED` com rótulo funcional `Removida`, tratando-o como estado final lógico de remoção.
- `CreatePermissionInput` repete campos já previstos no PRD; o BFF valida:
  - presença obrigatória;
  - consistência entre `key` e os segmentos `domain/area/resource/action`;
  - regex do naming `^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$`;
  - `displayName` e `description` com trim.
- `RemovePermissionInput` contém `confirmationText`; qualquer valor diferente de `CONFIRMO` retorna `400 INVALID_CONFIRMATION`.
- `PermissionRemovalEligibility` é um DTO derivado:
  - `linkedRoles: LinkedRole[]`
  - `canRemove: boolean`
  - `blockingReason?: 'STATUS_NOT_DEPRECATED' | 'ROLE_LINKS_PRESENT'`

Para os vínculos com papéis, a estratégia preferencial é agregar dados já existentes:

1. `GET /v1/roles?page=0&size=200&sort=displayName,asc`
2. `GET /v1/roles/{roleId}/permissions`

O BFF filtra os papéis cujo conjunto contenha a permissão alvo e devolve apenas `id`, `key`, `displayName` e `status`. Se o volume de papéis do ambiente real ultrapassar uma página confiável ou o contrato atual do `ecad-authz` não permitir busca segura sem fan-out excessivo, um endpoint dedicado no repo externo vira pré-requisito formal da remoção, conforme RF-21 do PRD.

### Endpoints de API

- `POST /api/autorizacao/permissoes`
- Cria uma permissão `ACTIVE` a partir do formulário administrativo.
- Corpo: `CreatePermissionInput`

- `POST /api/autorizacao/permissoes/:id/depreciar`
- Mantém o fluxo atual, mas agora passa por wrapper auditado do BFF.
- Sem corpo.

- `POST /api/autorizacao/permissoes/:id/reativar`
- Reativa apenas permissões `DEPRECATED`.
- Sem corpo.

- `POST /api/autorizacao/permissoes/:id/remover`
- Remove logicamente apenas permissões `DEPRECATED` e sem vínculos.
- Corpo: `{ "confirmationText": "CONFIRMO" }`

- `GET /api/autorizacao/permissoes/:id/papeis-vinculados`
- Retorna `PermissionRemovalEligibility`.

Chamadas do BFF para o `ecad-authz`:

- Confirmado: `GET /v1/permissions`
- Confirmado: `GET /v1/permissions/{id}`
- Confirmado: `PATCH /v1/permissions/{id}/deprecate`
- Confirmado: `GET /v1/roles`
- Confirmado: `GET /v1/roles/{roleId}/permissions`
- Ausente: `POST /v1/permissions`
- Ausente: endpoint administrativo de reativação de permissão
- Ausente: endpoint administrativo de remoção lógica/desativação individual de permissão
- Não adequado para UI administrativa: `POST /v1/permission-catalog/register`, porque o contrato é voltado a registro por microsserviço, com `service/domain/area/version/permissions[]`, e não a criação governada de uma permissão isolada por um operador humano

Conclusão contratual: com a OpenAPI atual, o MCAD consegue implementar imediatamente listagem, detalhe, depreciação e lookup de papéis vinculados. Cadastro, reativação e remoção dependem de extensão da API AuthZ; o BFF não deve simular esses comportamentos localmente.

## Pontos de Integração

- `ecad-authz`
  - autenticação: bearer do usuário propagado pelo BFF;
  - headers: propagar `x-correlation-id` e `x-authz-version`;
  - falhas 401/403/409/422 devem ser mapeadas sem perder `code` e `message`.
- `ecad-auditoria`
  - publicar um evento por mutação efetiva e por tentativa negada de remoção;
  - o BFF reaproveita `publishAuditEvent` e o padrão já usado na camada `auditoria/`.

A distribuição da auditoria fica assim:

- `ecad-authz` continua responsável por autorizar e por seus logs internos.
- O BFF publica a trilha governada consumível pelo MCAD, com ator, alvo, ação, resultado e correlação.
- O frontend não produz evento de negócio; apenas encaminha o `x-correlation-id` e os headers de contexto já emitidos em leitura.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
| ------------------ | --------------- | --------------------------- | -------------- |
| `frontend/src/features/authz/pages/PermissionsPage.tsx` | UI/UX | Adiciona CTA de cadastro condicionado ao contrato e filtro explícito para `DISABLED` com rótulo `Removida`. Risco baixo. | Atualizar tela e testes RTL |
| `frontend/src/features/authz/pages/PermissionDetailPage.tsx` | UI/UX | Passa a exibir vínculos, elegibilidade e ações condicionadas ao contrato disponível. Risco médio. | Refatorar detalhe e modais |
| `frontend/src/features/authz/api/*` | Cliente API | Novo cliente de mutações governadas e ajuste do enum de status. Risco baixo. | Atualizar tipos e hooks |
| `services/bff/src` | Nova rota | Wrapper para mutações e agregação de vínculos com auditoria. Risco médio. | Criar módulo dedicado + testes |
| `services/bff/src/proxy.ts` | Integração | Sem mudança funcional obrigatória; proxy legado permanece. Risco baixo. | Manter apenas para leitura simples |
| `ecad-authz` | Dependência externa | Exige novos endpoints de create/reactivate/remove; lookup de vínculos pode ser derivado com contratos atuais. Risco alto. | Abrir evolução contratual no repo externo |
| `ecad-auditoria` | Integração | Recebe novos tipos de evento administrativo. Risco baixo. | Alinhar esquema do payload |

## Abordagem de Testes

### Testes Unitários

- Frontend:
  - parsing e normalização de `PermissionStatus`;
  - formulário de criação com chave válida e inválida;
  - detalhe mostrando ações corretas por estado;
  - modal de remoção exigindo `CONFIRMO`;
  - renderização de lista de papéis vinculados e mensagens de bloqueio.
- BFF:
  - validação do payload de criação;
  - rejeição de confirmação incorreta;
  - bloqueio de remoção para status diferente de `DEPRECATED`;
  - bloqueio de remoção com vínculos;
  - mapeamento de `409 DUPLICATE_KEY`, `422 INVALID_STATUS`, `403 PERMISSION_DENIED`;
  - publicação de auditoria para sucesso e tentativa negada.

### Testes de Integração

- BFF com `fetchImpl` fake, seguindo o padrão de `acessosRoutes.test.ts`:
  - `POST /api/autorizacao/permissoes` devolvendo `501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE` enquanto o upstream não expõe contrato;
  - `POST /api/autorizacao/permissoes/:id/reativar` devolvendo `501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE` enquanto o upstream não expõe contrato;
  - `POST /api/autorizacao/permissoes/:id/remover` devolvendo `501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE` enquanto o upstream não expõe contrato;
  - `GET /api/autorizacao/permissoes/:id/papeis-vinculados` com papéis múltiplos.
- Frontend com Vitest/RTL:
  - gating do CTA de cadastro atrás de capability flag do contrato;
  - detalhe `ACTIVE -> DEPRECATED -> DISABLED` com rótulo `Removida`;
  - detalhe `DEPRECATED -> ACTIVE` habilitado apenas quando o endpoint existir;
  - estado vazio de vínculos e estado bloqueado.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. Abrir evolução contratual do `ecad-authz` para create/reactivate/remove de permissão.
2. Implementar no BFF o lookup de papéis vinculados e o wrapper auditado para depreciação.
3. Ajustar tipos/status no frontend para o enum oficial `DISABLED`.
4. Refatorar `PermissionsPage` e `PermissionDetailPage`.
5. Habilitar criação, reativação e remoção somente após disponibilidade dos endpoints no upstream.
6. Adicionar testes de regressão e smoke manual no ambiente DEV com usuário `authz:admin:*`.

### Dependências Técnicas

- Disponibilidade futura dos endpoints administrativos de create/reactivate/remove no `ecad-authz`.
- Acesso ao serviço de Auditoria já configurado no BFF via `AUDIT_BASE_URL`.
- Enum oficial do contrato: `ACTIVE | DEPRECATED | DISABLED`.

## Monitoramento e Observabilidade

- Logs estruturados no BFF:
  - `authz.permission.create`
  - `authz.permission.deprecate`
  - `authz.permission.reactivate`
  - `authz.permission.remove`
- Campos mínimos: `actor`, `permissionId`, `permissionKey`, `outcome`, `status`, `correlationId`.
- Métricas propostas no BFF:
  - `bff_authz_permission_lifecycle_total{action,outcome}`
  - `bff_authz_permission_lifecycle_latency_ms`
  - `bff_authz_permission_linked_roles_fanout_total`
- Reusar o padrão de correlação já existente no proxy e publicar eventos no serviço de Auditoria para consumo por dashboards existentes.

## Considerações Técnicas

### Decisões Principais

- Não criar backend novo de domínio; o BFF é suficiente como gateway governado e agregador.
- Manter leitura simples no proxy atual e concentrar regras de auditoria e vínculo em rotas próprias.
- Reutilizar imediatamente os contratos existentes para depreciação e composição de papéis.
- Tratar create/reactivate/remove como extensões obrigatórias do `ecad-authz`, não como lógica a ser emulada pelo MCAD.
- Adotar no frontend o rótulo de negócio `Removida` sobre o estado técnico `DISABLED`.

### Riscos Conhecidos

- O `ecad-authz` não expõe hoje os endpoints administrativos de create/reactivate/remove necessários ao PRD.
- A enumeração de vínculos por fan-out em `/roles/{id}/permissions` pode escalar mal se o catálogo crescer além do volume administrativo atual.
- O PRD usa `REMOVED`, mas o contrato oficial usa `DISABLED`; divergência semântica precisa ser absorvida no BFF/UI.
- O proxy genérico não produz a trilha de auditoria exigida; usar mutação direta por ele seria regressão de governança.

### Requisitos Especiais

- A ação de remoção deve ser visualmente tratada como destrutiva e exigir digitação literal `CONFIRMO`.
- Permissões `DISABLED` devem aparecer para o usuário como `Removidas` e não surgem na listagem padrão sem filtro explícito.
- A UI deve continuar utilizável por teclado e com mensagens anunciáveis por leitor de tela.
- Não introduzir biblioteca nova; reutilizar `ConfirmModal`, `PageHeader`, `useToast`, `Can`, `authzGet/Post/Patch/Delete` e a infraestrutura de auditoria existente.

### Conformidade com Padrões

- Segue ADR 0001: `ecad-authz` continua sendo a fonte autoritativa de autorização.
- Segue ADR 0002: validação explícita do formato `dominio:area:recurso:acao`.
- Segue ADR 0003: frontend apenas dirige UX; autorização e guards finais permanecem server-side.
- Segue ADR 0004: frontend continua falando apenas com BFF/proxy oficial.
- Segue ADR 0008: BFF é usado para integração cross-cutting quando há composição de serviços e regra adicional de negócio.
