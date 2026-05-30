---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>integration</type>
<scope>middleware</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"4.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 3.0: `CurrentActorResolver` na API e comandos com `ActorSnapshot`

## Relacionada as User Stories

- [HU-03] Identidade armazenada deve ser imutavel
- [HU-04] Operacao nao deve depender apenas de claims volateis

## Visao Geral

Centralizar a extracao do usuario autenticado na API e substituir leituras duplicadas de `auth.getName()`/JWT em controllers por um componente compartilhado. Os commands de escrita devem passar a receber `ActorSnapshot` ou campo equivalente, mantendo compatibilidade interna onde a migracao incremental exigir.

## Requisitos

- Criar `CurrentActorResolver` no modulo `arrecadacao-api`.
- Extrair `subject` da claim `sub`; fallback para `Authentication.getName()`.
- Extrair `username` de `preferred_username`, `displayName` de `name` e `email` de `email`.
- Criar modelo `CurrentActor` se necessario para desacoplar API de `ActorSnapshot`.
- Usar `ActorDisplayResolver.snapshotFrom(CurrentActor)` para montar snapshot de escrita.
- Substituir metodos locais `extrairAutor()`/`extrairAutorDoJwt()` em `LicencaController` e `UsuarioMusicaController`.
- Substituir uso direto de `Authentication.getName()` em `UdaController` e `PagamentoController`.
- Atualizar records de command afetados para receber `ActorSnapshot`.
- Logar `INFO` quando cair para autenticacao sem JWT em escrita humana.

## Subtarefas

- [ ] 3.1 Criar `CurrentActor` e `CurrentActorResolver` no modulo API.
- [ ] 3.2 Cobrir JWT completo, JWT sem `preferred_username`, autenticacao sem JWT e usuario sistema.
- [ ] 3.3 Atualizar commands de Licenca: criar, suspender, reativar e encerrar.
- [ ] 3.4 Atualizar commands de Usuario de Musica: criar, atualizar, inativar e ativar quando gerarem historico.
- [ ] 3.5 Atualizar `AjustarUdaCommand`, `RegistrarPagamentoCommand` se usar autor, e `EstornarPagamentoCommand`.
- [ ] 3.6 Atualizar controllers para injetar o resolver e remover extracoes duplicadas.
- [ ] 3.7 Ajustar testes de controller/API existentes para fornecer ator resolvido.
- [ ] 3.8 Garantir que permissao/autorizacao existente (`@RequiresPermission`/security config) nao seja alterada.

## Sequenciamento

- Bloqueado por: 1.0, 2.0
- Desbloqueia: 4.0, 5.0, 6.0
- Paralelizavel: Nao (contrato de entrada compartilhado pelos handlers)

## Rastreabilidade

- Esta tarefa cobre: identificador imutavel baseado em `sub`, reducao de duplicacao de extracao de autor e preparacao dos fluxos de escrita.
- Evidencia esperada: controllers sem extracao manual de autor e commands carregando snapshot do ator autenticado.

## Detalhes de Implementacao

Regras de extracao:

- `subject`: `JwtAuthenticationToken.getToken().getClaimAsString("sub")`; fallback `Authentication.getName()`.
- `username`: claim `preferred_username`; fallback nulo.
- `displayName`: claim `name`; fallback nulo.
- `email`: claim `email`; fallback nulo.

O label final nao deve ser montado manualmente no controller. O controller deve resolver o ator atual e delegar a montagem do snapshot para o componente de application criado na task 2.0.

## Criterios de Sucesso

- Todos os controllers de escrita afetados usam `CurrentActorResolver`.
- Nenhum novo historico usa apenas `auth.getName()` como fonte unica quando JWT com `sub` esta disponivel.
- Commands compilam com `ActorSnapshot`.
- Testes demonstram fallback seguro para autenticacao sem JWT.
