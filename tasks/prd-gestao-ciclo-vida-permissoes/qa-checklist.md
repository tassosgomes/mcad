# Checklist de Validação Manual — Ciclo de Vida de Permissões

Entrega completa (Fase 1 + Fase 2 unificadas). Validar com usuário de sessão que possua a permissão `authz:admin:*`.

Ambiente: `http://localhost:5173/autorizacao/permissoes`

---

## 1. Listagem de permissões

- [ ] A listagem abre com filtro padrão `Ativas` e exibe permissões com status `ACTIVE`.
- [ ] O botão `Cadastrar permissão` está visível e clicável (capability `canCreate: true`).
- [ ] O seletor de status exibe as opções `Ativas`, `Depreciadas` e `Removidas`.
- [ ] Selecionar `Depreciadas` e filtrar: exibe somente permissões com status `DEPRECATED`.
- [ ] Selecionar `Removidas` e filtrar: exibe somente permissões com status `DISABLED` com badge `Removida`.
- [ ] Permissões com status `DISABLED` não aparecem na listagem padrão sem filtro explícito.
- [ ] O campo de busca por texto filtra por chave, nome ou descrição.
- [ ] Clicar em `Detalhes` navega para o detalhe da permissão correspondente.
- [ ] `Atualizar` recarrega o catálogo sem erros.

---

## 2. Detalhe de permissão

- [ ] A página de detalhe exibe: nome de exibição, chave, domínio, área, recurso, ação, descrição e status com badge correto.
- [ ] O painel `Papéis vinculados` carrega e exibe a lista de papéis vinculados com chave, nome e status de cada papel.
- [ ] Quando não há papéis vinculados, o painel exibe mensagem de ausência de vínculos.
- [ ] O detalhe de uma permissão `ACTIVE` exibe apenas o botão `Depreciar permissão`.
- [ ] O detalhe de uma permissão `DEPRECATED` exibe os botões `Reativar` e `Remover` (se elegível).
- [ ] O detalhe de uma permissão `DISABLED` não exibe ações de mutação.
- [ ] O botão `Voltar` retorna para a listagem.

---

## 3. Deprecação de permissão (`ACTIVE → DEPRECATED`)

Pré-condição: permissão com status `ACTIVE`.

- [ ] O botão `Depreciar permissão` está habilitado.
- [ ] Clicar abre modal de confirmação com nome da chave da permissão.
- [ ] Confirmar depreca a permissão: status muda para `DEPRECATED` e badge atualiza.
- [ ] Toast de sucesso é exibido.
- [ ] Cancelar fecha o modal sem alterar a permissão.
- [ ] Um evento `PERMISSION_LIFECYCLE / deprecate / SUCCESS` é publicado no ecad-auditoria.

---

## 4. Reativação de permissão (`DEPRECATED → ACTIVE`)

Pré-condição: permissão com status `DEPRECATED`.

- [ ] O painel de ações exibe o botão `Reativar`.
- [ ] Clicar abre modal de confirmação.
- [ ] Confirmar reativa a permissão: status volta para `ACTIVE`.
- [ ] Toast de sucesso é exibido.
- [ ] Tentar reativar uma permissão `ACTIVE` via API direta retorna erro semântico adequado (não acessível pela UI normal — verificar BFF).

---

## 5. Cadastro de nova permissão

Caminho: botão `Cadastrar permissão` na listagem → `/autorizacao/permissoes/nova`.

- [ ] O formulário exibe os campos: domínio, área, recurso, ação, nome de exibição e descrição.
- [ ] A chave é gerada automaticamente a partir dos quatro segmentos: `dominio:area:recurso:acao`.
- [ ] A chave gerada aparece em pré-visualização no formulário antes do submit.
- [ ] Segmentos com caracteres especiais ou maiúsculos são normalizados (lowercase, sem acentos).
- [ ] Submit sem campos obrigatórios preenchidos não envia (validação client-side).
- [ ] Submit com chave válida e inédita cria a permissão com status `ACTIVE` e navega para o detalhe.
- [ ] Tentativa de criar chave duplicada retorna mensagem de erro: `PERMISSION_KEY_ALREADY_EXISTS`.
- [ ] Formato de chave inválido retorna `INVALID_PERMISSION_NAMESPACE`.

---

## 6. Remoção lógica (`DEPRECATED → DISABLED`)

Pré-condição: permissão `DEPRECATED` sem papéis ativos vinculados.

- [ ] O botão `Remover` só está habilitado quando a permissão está depreciada **e** sem papéis ativos.
- [ ] Quando há papéis ativos vinculados, o painel exibe mensagem de bloqueio listando os papéis impedidores.
- [ ] Clicar em `Remover` abre modal com campo de texto.
- [ ] O botão de confirmação permanece desabilitado enquanto o campo não contém exatamente `CONFIRMO`.
- [ ] Digitar `confirmo` (minúsculas) ou qualquer variação mantém o botão desabilitado.
- [ ] Digitar `CONFIRMO` e confirmar remove logicamente a permissão: status passa para `DISABLED` / badge `Removida`.
- [ ] Toast de sucesso é exibido. A permissão não aparece mais na listagem padrão.
- [ ] Fechar o modal (Cancelar) enquanto a ação está pendente é bloqueado.
- [ ] Um evento `PERMISSION_LIFECYCLE / remove / SUCCESS` é publicado no ecad-auditoria.

---

## 7. Casos de erro e bloqueios

- [ ] Tentativa de remover permissão `ACTIVE` via API direta retorna `422 INVALID_PERMISSION_STATUS_TRANSITION` (não exposto pela UI normal).
- [ ] Tentativa de remover com papéis ativos vinculados retorna `409 PERMISSION_IN_USE` com lista de papéis (validado pelo BFF antes de chamar o upstream).
- [ ] Confirmação inválida via API direta retorna `400 INVALID_CONFIRMATION` com evento de auditoria `FAILURE`.
- [ ] Upstream indisponível retorna `503 AUTHZ_SERVICE_UNAVAILABLE` sem expor detalhes internos.
- [ ] Usuário sem permissão `authz:admin:permission:*` recebe `403 PERMISSION_DENIED` em todas as rotas do BFF.
- [ ] Fluxo `ACTIVE → DEPRECATED → DISABLED` é irreversível: permissão `DISABLED` não expõe ações de reativação.

---

## 8. Auditoria e observabilidade

- [ ] Cada mutação bem-sucedida (create, deprecate, reactivate, remove) gera um evento no `ecad-auditoria` com campos: `eventType`, `action`, `outcome: SUCCESS`, `actor.subject`, `permission.id`, `permission.key`, `correlationId`.
- [ ] Tentativa negada de remoção (confirmação inválida) gera evento com `outcome: FAILURE` e `errorCode: INVALID_CONFIRMATION`.
- [ ] O `x-correlation-id` propagado nas respostas do BFF é um UUID válido.
- [ ] O `x-authz-version` retornado pelo upstream é propagado nas respostas do BFF.

---

## 9. Acessibilidade

- [ ] Todos os fluxos principais são operáveis por teclado (Tab, Enter, Escape).
- [ ] O campo de confirmação `CONFIRMO` está associado semanticamente ao texto explicativo via `aria-describedby`.
- [ ] Mensagens de toast de sucesso e erro são anunciáveis por leitores de tela.
- [ ] Status das permissões não é transmitido apenas por cor (badge com texto + role semântico).
