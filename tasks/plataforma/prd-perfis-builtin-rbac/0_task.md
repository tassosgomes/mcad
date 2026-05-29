---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>engine/integration/distribuicao-cadastro-acl</domain>
<type>investigation</type>
<scope>integration</scope>
<complexity>low</complexity>
<dependencies>java,dotnet,jwt</dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 0.0: Investigar propagação de JWT em ACL Distribuição → Cadastro

## Relacionada às User Stories

- [US-06] Operador de Suporte (LGPD com CPF mascarado) — cobertura de suporte

## Visão Geral

O mascaramento de CPF em Cadastro (Tarefa 2.0) precisa receber o JWT do **usuário final** para verificar a permissão `cadastro:default:titular:ver-cpf-completo`. Se Distribuição hoje chama Cadastro com **service token** ou **sem credencial nenhuma**, o mascaramento aplicará como "sem permissão" mesmo para Analistas/Gerentes legítimos, quebrando o fluxo.

Esta tarefa é uma investigação de codebase + documentação. Não escreve código de produção — entrega é um documento curto descrevendo o estado atual e a recomendação. Resolve a primeira "Questão em Aberto" da TechSpec, que é o único bloqueante real para a Fase 1.

## Requisitos

- Mapear o(s) ponto(s) onde `distribuicao-api` chama `cadastro-api` para obter dados de Titular (ACL de ownership snapshot, conforme Domain Doc §5).
- Identificar como o cabeçalho `Authorization` é construído nessa chamada (JWT do usuário propagado? service token? sem credencial?).
- Documentar o padrão observado e, se for diferente do esperado, propor mudança mínima (passar `Authorization` do request original).
- Atualizar a TechSpec na seção "Questões em Aberto" marcando o item como resolvido.

## Arquivos Envolvidos

- **Criar:**
  - `tasks/plataforma/prd-perfis-builtin-rbac/investigation-jwt-propagation.md` (relatório curto, ~300 linhas máx.)
- **Modificar:**
  - `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md` (atualizar item da seção "Questões em Aberto")
- **Referência:**
  - `services/distribuicao-api/distribuicao-application/` (procurar `CadastroClient`, `OwnershipSnapshot`, `TitularResource`, ou similares)
  - `services/distribuicao-api/distribuicao-infra/` (clientes HTTP)
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` (config de `cadastro.base-url` ou similar)
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (validação do JWT do request)
- **Skills para consultar:**
  - `java-architecture` — padrões de cliente HTTP externo em Spring Boot

## Subtarefas

- [ ] 0.1 Grep por `cadastro` em `services/distribuicao-api/` para localizar a chamada ACL
- [ ] 0.2 Inspecionar o RestTemplate/WebClient/Feign que faz a chamada — verificar se há `Interceptor` adicionando `Authorization`
- [ ] 0.3 Validar com um teste cURL real (ou request interceptado) se o header `Authorization: Bearer <jwt-do-usuario>` chega no Cadastro
- [ ] 0.4 Escrever `investigation-jwt-propagation.md` com: estado atual, evidências (linhas de código + saída de log), recomendação
- [ ] 0.5 Atualizar a TechSpec marcando a questão como resolvida (ou adicionando a recomendação)

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0
- Paralelizável: Sim — pode rodar em paralelo a 1.0

## Rastreabilidade

- Esta tarefa cobre: US-06 (suporte) e a 1ª "Questão em Aberto" da TechSpec
- Evidência esperada: arquivo `investigation-jwt-propagation.md` com seções **Estado Atual**, **Evidências** (snippets + caminhos), **Recomendação**, **Próximos passos para Tarefa 2.0**

## Detalhes de Implementação

A chamada esperada (com base no Domain Doc de Distribuição §5):

> Cadastro → Consulta HTTP (Open Host Service) — Titularidades autorais (percentuais por obra) e participações conexas (percentuais por fonograma) para calcular a distribuição de créditos.

Procurar por classes do tipo `CadastroAclClient`, `OwnershipSnapshotProvider`, `TitularidadeSnapshotService` no módulo `distribuicao-application` ou `distribuicao-infra`.

**Cenários possíveis a documentar:**

| Cenário | Implicação para Tarefa 2.0 |
|---|---|
| (A) JWT do usuário é propagado | Tarefa 2.0 procede sem mudanças — `HttpContext.User` no Cadastro reflete o usuário original. |
| (B) Service token (cliente m2m com `client_credentials`) | Tarefa 2.0 precisa decidir se: (i) Distribuição propaga JWT do usuário em vez de service token (mudança mínima), ou (ii) Cadastro aceita um header `X-Forwarded-Permissions` confiável vindo apenas de serviços do mesmo mesh. **Decisão preferencial: (i).** |
| (C) Sem credencial (rede privada confiável) | Igual a (B); preferir (i). |

**Comando útil para validação:**

```bash
# Em DEV, logar um Analista, capturar JWT, criar Processo que dispara a ACL e verificar logs:
curl -sH "Authorization: Bearer $JWT_ANALISTA" \
  -X POST "$DISTRIBUICAO_BASE/api/v1/processos/{id}/calcular"

# Em paralelo, watch nos logs de Cadastro pelo header recebido:
docker logs -f cadastro-api 2>&1 | grep -i "Authorization\|sub="
```

## Critérios de Sucesso (Verificáveis)

- [ ] Arquivo `investigation-jwt-propagation.md` criado com no mínimo seções: Estado Atual, Evidências, Recomendação
- [ ] Recomendação inclui o cenário identificado (A/B/C) e a ação preferida para Tarefa 2.0
- [ ] TechSpec atualizada — primeira "Questão em Aberto" marcada como resolvida com referência ao arquivo de investigação
- [ ] Se cenário não-A: relatório lista os arquivos do `distribuicao-api` que precisam ser tocados para passar a propagar JWT (lista vai virar subtarefa de 2.0)
