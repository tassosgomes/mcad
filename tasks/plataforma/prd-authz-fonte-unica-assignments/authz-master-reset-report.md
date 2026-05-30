# AuthZ QA master reset report

Data: 2026-05-30

## Objetivo

Limpar atribuicoes antigas de QA no `ecad-authz` apos a remocao de roles de negocio do Logto e manter um unico usuario com acesso amplo para replanejar a matriz de papeis.

## Resultado aplicado

- Papel criado: `mcad.default.master`
- Usuario master: `admin_authz@mcad.dev`
- Atribuicoes antigas removidas dos usuarios QA: 17
- Demais usuarios QA ficaram sem papeis ativos
- Permissoes efetivas do master apos correcao: 121

## Ajustes operacionais executados

- Corrigido `admin_area` do `admin_authz@mcad.dev` para `GLOBAL` para permitir operacoes administrativas globais.
- Reativadas 41 permissoes oficiais de Cadastro que estavam `DEPRECATED` no banco remoto.
- Adicionadas as permissoes de Cadastro ao papel `mcad.default.master`.
- Incrementada a `authz_version` do usuario master para invalidar contexto antigo.

## Validacao

Consulta via BFF `/api/me/permissions` para `admin_authz@mcad.dev` retornou:

```json
{
  "permissionCount": 121,
  "version": 11,
  "cadastroListar": true,
  "cadastroCriar": true,
  "titularListar": true
}
```

Teste de login/token sem roles via `.env_qa` retornou PASS para os usuarios cobertos pelo runner existente.

## Observacoes

- O sync de identidade pode voltar `admin_area` para `null` em novo login se o evento publicado nao carregar esse campo. Isso nao remove o papel master, mas bloqueia operacoes administrativas globais que dependem de `adminArea`.
- O papel master foi usado como medida temporaria de QA. A matriz definitiva de papeis deve substituir esse arranjo.
