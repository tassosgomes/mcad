# Logto Cloud — Setup via Console UI

Objetivo: configurar o tenant do Logto Cloud e gerar o token M2M que o script de provisioning usará para criar aplicações, roles e usuários automaticamente via Management API.

---

## 1. Criar conta e tenant

1. Acesse [cloud.logto.io](https://cloud.logto.io) e crie sua conta.
2. No primeiro acesso, o assistente pede para criar um **tenant**.
   - **Tenant name**: `mcad` (ou o nome que preferir — é só um label)
   - **Region**: escolha a mais próxima (ex: Europe para menor latência a partir do Brasil)
3. Anote a URL do tenant — será algo como `https://abc123.logto.app`. Esse valor vai para `OIDC_AUTHORITY` em todos os serviços.

---

## 2. Criar a aplicação M2M para o script de provisioning

A Management API do Logto só aceita tokens emitidos para aplicações do tipo **Machine-to-Machine**.

1. No menu lateral, clique em **Applications**.
2. Clique em **Create application**.
3. Selecione o tipo **Machine-to-machine**.
4. Preencha:
   - **Application name**: `mcad-provisioning`
   - **Description**: `Script de provisionamento de roles e usuários (uso local)`
5. Clique em **Create application**.
6. Na tela seguinte, anote:
   - **App ID** → será `LOGTO_M2M_CLIENT_ID` no `.env`
   - **App secret** → será `LOGTO_M2M_CLIENT_SECRET` no `.env`

   > O secret só é exibido uma vez. Copie antes de sair da tela.

---

## 3. Autorizar a app M2M a chamar a Management API

Por padrão, uma app M2M não tem acesso à Management API. É preciso vincular explicitamente.

1. Ainda na página da app `mcad-provisioning`, role até a seção **Permissions**.
2. Clique em **Assign roles** (ou **Add API permissions**, dependendo da versão do Console).
3. Na lista de APIs, selecione **Logto Management API**.
4. Marque a role **`all`** (acesso completo — adequado para uso local de provisionamento).
5. Clique em **Save**.

   > A Management API do Logto usa o resource indicator `https://<tenant>.logto.app/api`.
   > O Console já preenche isso automaticamente ao selecionar "Logto Management API".

---

## 4. Testar a geração do token

Com o App ID e secret em mãos, execute o comando abaixo para confirmar que tudo está correto antes de rodar o script de provisioning:

```bash
curl -X POST https://<tenant>.logto.app/oidc/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=<LOGTO_M2M_CLIENT_ID>" \
  -d "client_secret=<LOGTO_M2M_CLIENT_SECRET>" \
  -d "resource=https://<tenant>.logto.app/api" \
  -d "scope=all"
```

Resposta esperada:

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "all"
}
```

Se retornar `access_token`, a configuração está correta. Esse token é o que o script de provisioning usará no header `Authorization: Bearer <token>` para criar roles, usuários e a aplicação frontend.

---

## 5. Variáveis de ambiente resultantes

Após as etapas acima, adicione ao `.env` local (nunca commite o `.env`):

```env
# Logto Cloud
OIDC_AUTHORITY=https://<tenant>.logto.app
LOGTO_M2M_CLIENT_ID=<app-id-da-mcad-provisioning>
LOGTO_M2M_CLIENT_SECRET=<secret-da-mcad-provisioning>
LOGTO_MANAGEMENT_API=https://<tenant>.logto.app/api
```

O `OIDC_AUDIENCE` será definido na etapa seguinte (criação do API Resource via script).

---

## Próximo passo

Com o token M2M funcionando, o script de provisioning (`scripts/provision-logto.sh`) conseguirá:

- Criar a aplicação SPA `mcad-frontend` (PKCE)
- Registrar o API Resource (gera o `OIDC_AUDIENCE`)
- Criar as 7 roles de domínio
- Criar os 7 usuários de teste e atribuir as roles

> Referência: [Logto — Interact with Management API](https://docs.logto.io/docs/recipes/interact-with-management-api/)
