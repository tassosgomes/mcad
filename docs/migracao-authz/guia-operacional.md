# Guia operacional para migração de AuthZ por serviço

Este guia registra a sequência correta para migrar cada serviço do MCAD para autorização fina via `ecad-authz`.

O ponto crítico aprendido na migração do `cadastro-api`: a API não deve ser implantada exigindo permissões que ainda não existem no catálogo do `ecad-authz`, pois isso impede a atribuição na tela administrativa e causa negação de acesso.

## Ordem recomendada

1. Mapear permissões do serviço
   - Listar todos os endpoints protegidos.
   - Definir permissões no formato do PRD: `{dominio}:{recurso}:{acao}`.
   - Exemplo: `cadastro:obra:listar`.
   - Evitar permissões genéricas como `read`, `write`, `admin` ou `dominio:*:*`.

2. Registrar catálogo no `ecad-authz`
   - Criar ou atualizar arquivo YAML em:

     ```text
     backend/authz-bootstrap/src/main/resources/permissions/
     ```

   - Incluir o arquivo no bootstrap, como foi feito para:

     ```text
     permissions/mcad-cadastro-catalog.yaml
     ```

   - Cada permissão deve conter:
     - `key`
     - `displayName`
     - `description`

3. Validar e publicar imagem do `ecad-authz`
   - Rodar:

     ```bash
     mvn -B -ntp -pl authz-bootstrap -am test
     ```

   - Confirmar no log de startup algo como:

     ```text
     catalog_registration service=<servico> registered=<N>
     ```

   - Subir a nova imagem do `ecad-authz`.
   - Abrir a tela de permissões e validar que as permissões do serviço aparecem.

4. Criar ou atualizar papéis
   - Criar papéis iniciais por domínio, por exemplo:
     - `cadastro.consultor`
     - `cadastro.analista`
   - Associar permissões de leitura ao papel consultor.
   - Associar permissões de leitura e escrita/processamento ao papel analista.

5. Atribuir papéis aos usuários de teste
   - Garantir que os usuários já foram provisionados no `ecad-authz`.
   - Se necessário, executar o backfill/sync do Logto.
   - Atribuir os papéis pela tela administrativa.

6. Migrar a API do domínio
   - Trocar `RequireAuthorization("read")` e `RequireAuthorization("write")` por permissões explícitas.
   - Em .NET, usar `RequirePermission(...)` ou helper equivalente.
   - Manter OIDC/JWT apenas como autenticação.
   - A decisão de autorização deve vir do `ecad-authz`.

7. Validar ponta a ponta
   - Sem token deve retornar `401`.
   - Token válido sem permissão deve retornar `403`.
   - Token com permissão deve passar pela autorização.
   - Para escrita, payload inválido pode retornar `400`; isso é aceitável se não retornar `403`.

## Checklist antes de subir a API migrada

```text
[ ] Catálogo do serviço existe no ecad-authz
[ ] Nova imagem do ecad-authz foi publicada e implantada
[ ] Tela de permissões mostra as permissões do serviço
[ ] Papéis iniciais foram criados
[ ] Permissões foram atribuídas aos papéis
[ ] Usuários de teste foram provisionados
[ ] Papéis foram atribuídos aos usuários de teste
[ ] API foi migrada para permissões explícitas
[ ] Testes 401/403/sucesso foram executados
```

## Convenções

Permissões novas no MCAD devem seguir:

```text
{dominio}:{recurso}:{acao}
```

Exemplos:

```text
cadastro:obra:listar
cadastro:titular:editar
identificacao:obra:validar
arrecadacao:cobranca:emitir
distribuicao:roteiro:processar
```

O `ecad-authz` também aceita permissões legadas em 4 partes:

```text
{dominio}:{area}:{recurso}:{acao}
```

Esse formato deve ser mantido apenas por compatibilidade.

## Evidência esperada em validação

Durante o teste do bootstrap do `ecad-authz`, o log deve mostrar o catálogo do serviço sendo registrado:

```text
self_catalog_registration path=permissions/<catalogo>.yaml service=<servico> registered=<N> updated=<N> deprecated=<N> ignored=<N>
```

Se `registered=0`, isso pode ser normal em reexecuções idempotentes, desde que as permissões já apareçam na tela administrativa.

## Ordem para os próximos serviços

Para cada API restante, repetir a sequência:

1. `ecad-authz`: adicionar catálogo do serviço.
2. `ecad-authz`: publicar e subir imagem.
3. Admin UI: confirmar permissões visíveis.
4. Admin UI: criar papéis e atribuir permissões.
5. Admin UI: atribuir papéis aos usuários.
6. API do domínio: migrar endpoints para permissões explícitas.
7. API do domínio: publicar e subir imagem.
8. Validar `401`, `403` e sucesso com permissão.

Não inverter os passos 1-3 com o passo 6.
