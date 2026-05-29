# ADR 0009 — Mascaramento Server-Side de CPF via Permission-Aware Mapper

- **Status:** Accepted
- **Data:** 2026-05-26
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** LGPD, privacidade, .NET, Cadastro

---

## Context

A entrega do framework de perfis built-in introduz a permissão `cadastro:default:titular:ver-cpf-completo` (categoria "Ação sensível / UI" — ver ADR 0006). Apenas perfis com essa permissão (Gerente e Analista de Distribuição, e no futuro Cadastro) devem ver o CPF completo do Titular; demais perfis recebem o CPF mascarado (XXX.***.***-XX).

**Estado atual em Cadastro (.NET 8):**

- `TitularResponse` (em `2-Application/Cadastro.Application/Titulares/Responses/TitularResponse.cs`) expõe `Documento` (CPF/CNPJ cru) e `DocumentoFormatado` (CPF formatado).
- O mapeamento `Titular → TitularResponse` acontece no `ListarTitularesQueryHandler` e em outros query handlers.
- Não há nenhuma consciência de permissão na camada de mapeamento.
- Frontend já tem `usePermissions` (`shared/authz/`) e poderia mascarar, mas isso é **burlável via DevTools** e viola LGPD porque o PII trafega no payload.

Se mantivermos mascaramento apenas client-side, o backend continua expondo CPF completo para qualquer usuário autenticado — risco regulatório real.

## Decision

Implementar **mascaramento server-side de CPF no Cadastro** via **mapper consciente de permissão**, isto é, um componente que lê a identidade do caller no `HttpContext.User` e decide a forma do `Documento`/`DocumentoFormatado` na resposta.

### Componentes

1. **Nova abstração `ICurrentUserPermissions`** em `Cadastro.Application/Common/Authorization/`.
   - Interface simples: `bool Has(string permission)`.
   - Implementação concreta `HttpContextCurrentUserPermissions` em `Cadastro.API/Authorization/` lê `HttpContext.User.Claims` (pré-populadas pelo middleware do `Ecad.Authz.AspNetCore`).
   - Registrada como `Scoped` no DI.

2. **Função utilitária `DocumentoMasking.Apply(string documento, string formatado, bool fullAllowed)`** em `Cadastro.Application/Titulares/`.
   - Se `fullAllowed = true`, retorna o par original.
   - Se `false`, retorna `("XXX.XXX.XXX-XX", "XXX.***.***-XX")` ou equivalente.

3. **Query handlers de Titular** (`ListarTitularesQueryHandler`, `BuscarTitularPorIdQueryHandler`, etc.) recebem `ICurrentUserPermissions` via construtor; aplicam `DocumentoMasking` no mapeamento de cada item.

### Permissão

- Chave: `cadastro:default:titular:ver-cpf-completo`
- Categoria: Ação sensível / UI
- Inclusão nos perfis (Phase 1):
  - `cadastro.default.analista` (carve-out controlado: preserva visibilidade atual)
  - `distribuicao.default.gerente` (cross-domain)
  - `distribuicao.default.analista` (cross-domain)
- Phase 3 (PRDs subsequentes): incluída em `cadastro.default.gerente` e `cadastro.default.analista` quando o PRD de Cadastro materializar os perfis intermediários.

### Caminho de chamada

```
HTTP request → ASP.NET Auth Middleware (popula HttpContext.User com claims do JWT)
            → Endpoint
            → QueryHandler (recebe ICurrentUserPermissions via DI)
            → DocumentoMasking.Apply
            → TitularResponse mascarado ou completo
```

### Endpoints consumidores via ACL

Quando `distribuicao-api` consulta `cadastro-api` para obter o snapshot de ownership (já existe esse padrão no domínio), o JWT do caller é propagado (estado a confirmar na implementação). O mascaramento aplica-se igualmente — Distribuição não vê CPF completo a menos que o caller original tenha a permissão.

## Alternativas Consideradas

### Alternativa 1: Endpoint dedicado para CPF completo

- **Descrição:** `TitularResponse` sempre mascarado; criar `GET /api/v1/titulares/{id}/documento-completo` com `RequirePermission`.
- **Prós:** auditoria fica explícita no log de acesso ao endpoint; permissão é gateada na borda (sem precisar checar dentro do handler).
- **Contras:** frontend faz 2 chamadas para listas; muda o modelo de DTO; mais difícil em casos batch.
- **Por que rejeitada:** custo de roundtrip e complexidade de UI maiores que o ganho de auditoria (o endpoint padrão também pode ser auditado).

### Alternativa 2: `IResultFilter` / middleware ASP.NET genérico

- **Descrição:** Pipeline ASP.NET intercepta respostas com campos `Documento`/`DocumentoFormatado` e mascara conforme `HttpContext.User`.
- **Prós:** generaliza para qualquer DTO com esse campo; sem mudar handlers.
- **Contras:** "mágico" (não óbvio em código); quebra se DTO renomear o campo; teste mais difícil; reflection em request hot path.
- **Por que rejeitada:** ofuscação contra explicitude. Mapper consciente é mais simples de auditar e testar.

### Alternativa 3: Mascaramento apenas no frontend

- **Descrição:** Manter backend retornando CPF completo; frontend usa `Can` para esconder.
- **Prós:** zero mudança no backend.
- **Contras:** burlável via DevTools/cURL; viola LGPD; payload pode aparecer em logs/exports.
- **Por que rejeitada:** o usuário explicitamente vetou ("no frontend é burlável").

### Alternativa 4: Sem permissão; sempre mascarar

- **Descrição:** Mascarar para todos, sem perfil que veja completo.
- **Prós:** simples; alinhamento estrito com LGPD.
- **Contras:** Analista de Cadastro/Distribuição precisa do CPF completo para trabalho legítimo (resolver pendências, conferir titularidade); torna sistema inviável.
- **Por que rejeitada:** quebra fluxo de trabalho real.

## Consequências

### Positivas

- LGPD cumprida na borda do servidor — payload não vaza CPF para quem não pode ver.
- Mantém estrutura de DTO atual (só muda o conteúdo do campo conforme caller).
- Mapper testável de forma isolada (`DocumentoMasking.Apply` é função pura).
- Permissão usa o catálogo authz existente; sem dependência em campo de banco ou flag externa.

### Negativas

- Pequena complexidade adicional nos query handlers (1 dependência via DI).
- Carve-out em Cadastro adiantado sem o PRD pleno de Cadastro — pequena dívida documentada (refactor completo virá em PRD posterior).
- O usuário Analista atual (com `cadastro.default.analista`) precisa receber a nova permissão no re-seed para continuar vendo CPF — sem isso, perde visibilidade involuntariamente.

### Riscos

- **Risco de propagação de JWT em chamadas inter-serviços:** se Distribuição chama Cadastro com service token (não JWT do usuário), o mascaramento aplica como "sem permissão" — pode vazar dados (CPF mascarado é benigno) ou bloquear feature (Analista de Distribuição não vê CPF mesmo tendo direito). **Mitigação:** Padronizar propagação de JWT do usuário em chamadas ACL Distribuição→Cadastro (item de Questões em Aberto do PRD).
- **Risco de cobertura de testes incompleta:** ao adicionar mascaramento condicional, testes existentes podem usar `analista.dev` (que terá a permissão) e mascarar não aparecer. **Mitigação:** adicionar testes específicos para cenários de perfil sem `ver-cpf-completo`.

## Notas de Implementação

- Arquivos novos:
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Authorization/ICurrentUserPermissions.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/DocumentoMasking.cs`
  - `services/cadastro-api/1-Services/Cadastro.API/Authorization/HttpContextCurrentUserPermissions.cs`
- Arquivos modificados:
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQueryHandler.cs` (constructor + map)
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/BuscarTitularPorIdQueryHandler.cs` (idem)
  - Demais handlers que retornam `TitularResponse` ou `Documento` em outros DTOs (verificar)
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (DI registration)
  - `seeds/mcad/cadastro.permissions.json` (adiciona `titular:ver-cpf-completo`)
  - `seeds/mcad/roles.json` (atualiza `cadastro.default.analista` para incluir a permissão)
- Testes integration em `5-Tests/Cadastro.IntegrationTests/`:
  - Caller com perfil contendo `cadastro:default:titular:ver-cpf-completo` → Documento completo.
  - Caller sem essa permissão → Documento mascarado.

## Referências

- PRD: `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
- ADR 0006 — Catálogo canônico de perfis built-in
- LGPD Art. 6º (necessidade, adequação, minimização)
- `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Responses/TitularResponse.cs` — DTO atual
