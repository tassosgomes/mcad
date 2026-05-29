---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>plataforma/logto/provisioning</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>logto,oidc,seeds</dependencies>
<unblocks>8.0</unblocks>
</task_context>

# Tarefa 4.0: Reescrever provisionamento Logto para autenticacao pura e fixtures explicitas

## Relacionada as User Stories

- Administrador de Plataforma provisiona apenas autenticacao e recursos OIDC.
- Usuario de teste recebe acesso por assignment explicito no `ecad-authz`, nao por role do Logto.

## Visao Geral

Atualizar `scripts/provision-logto.sh` para criar/manter SPA, API Resource, configuracoes OIDC e usuarios de teste sem criar roles de negocio, atribuir roles ou customizar access token com claim `roles`.

## Requisitos

- Remover criacao/atualizacao de roles de negocio no Logto.
- Remover atribuicao de roles a usuarios.
- Remover JWT customizer `jwt.accessToken.roles`.
- Garantir que o token continue com audience valida sem depender de scope `roles`.
- Manter fixtures locais de acesso em `seeds/mcad/assignments.json` e seed do `ecad-authz`.
- Atualizar mensagens/resumo de saida do script.

## Arquivos Envolvidos

- **Modificar:**
  - `scripts/provision-logto.sh`
  - `scripts/seed-authz.sh` se precisar expor fluxo documentado para assignments de DEV
  - `seeds/mcad/assignments.json` se fixtures precisarem cobrir usuarios de teste
  - `.env.example`
  - `README.md` ou documentacao de setup local
- **Referencia:**
  - `docs/adr/0001-authn-logto-authz-ecad-authz.md`
  - `docs/adr/0008-bff-gateway-cross-cutting.md`

## Subtarefas

- [ ] 4.1 Remover constantes/funcoes de roles de negocio do script de provisionamento.
- [ ] 4.2 Remover atribuicao de roles aos usuarios de teste.
- [ ] 4.3 Remover criacao/atualizacao do JWT customizer de access token com claim `roles`.
- [ ] 4.4 Revisar scopes do API Resource para manter audience valida sem `roles` e sem dependencia funcional de `write`.
- [ ] 4.5 Atualizar resumo final do script para reportar SPA, API Resource e usuarios, nao roles.
- [ ] 4.6 Garantir que fixtures DEV/CI sejam criadas por `seeds/mcad/assignments.json` via `scripts/seed-authz.sh`.
- [ ] 4.7 Adicionar modo/validacao que falha se role de negocio for provisionada pelo Logto.
- [ ] 4.8 Atualizar documentacao de setup local e CI.

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 8.0
- Paralelizavel: Nao para aplicacao em ambiente real. A edicao pode ser feita antes, mas deve ser aplicada somente apos migracao validada.

## Rastreabilidade

- Cobre RF-03 e prepara RF-07.
- Evidencia esperada: ambiente limpo provisionado sem roles de negocio no Logto e com acesso via assignments `ecad-authz`.

## Detalhes de Implementacao

O provisionamento alvo deve limitar-se a:

```text
1. Aplicacao SPA
2. API Resource/audience
3. Configuracao OIDC necessaria
4. Usuarios de teste
5. Instrucoes para rodar seed de assignments no ecad-authz
```

Qualquer necessidade de permissao de negocio em DEV/CI deve ser atendida por seed do `ecad-authz`.

## Criterios de Sucesso Verificaveis

- [ ] Execucao em ambiente limpo nao chama endpoints Logto `/roles` nem `/users/{id}/roles`.
- [ ] Access token sem claim `roles` permite autenticacao e chamada ao BFF com audience valida.
- [ ] Usuarios de teste sem assignment recebem deny seguro.
- [ ] Usuarios de teste com fixture em `seeds/mcad/assignments.json` acessam pelas permissoes efetivas.
- [ ] Documentacao deixa claro que Logto nao e fonte de assignments.
