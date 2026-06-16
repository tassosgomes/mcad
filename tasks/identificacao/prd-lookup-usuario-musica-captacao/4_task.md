---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>identificacao/application + api/endpoints</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<risk>low</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>unit</validation_level>
<context_budget>small</context_budget>
<dependencies>database</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 4.0: Identificação — Endpoint de busca local de Usuários de Música

## Visão Geral

Endpoint de busca que consulta **apenas** a projeção local (`usuario_musica_snapshot`), retornando usuários ATIVOS cuja razão social contém o termo (ILIKE, min 2 chars), paginado (size 10), opcionalmente por CNPJ. Sem nenhuma chamada à Arrecadação.

Cobre **RF-03** do PRD. Endpoint consumido pelo frontend (task 7.0).

## Requisitos

- `GET /api/v1/usuarios-musica?q={razaoSocial}&cnpj={cnpj}` → lista paginada, `status=ATIVO`, ILIKE razão social, size 10.
- Query CQRS (`BuscarUsuariosMusicaQuery` + Handler) seguindo o padrão `dotnet-architecture`.
- Permissão de leitura da Identificação.

## Subtarefas

- [ ] 4.1 Criar `BuscarUsuariosMusicaQuery` (record, IQuery) + `BuscarUsuariosMusicaQueryHandler` (2-Application/UsuariosMusica/Queries)
- [ ] 4.2 Criar `UsuarioMusicaSnapshotResponse` (record: Id, RazaoSocial, Cnpj)
- [ ] 4.3 Adicionar método `BuscarAsync(string q, string? cnpj, int page, int size)` no `IUsuarioMusicaSnapshotRepository` + impl
- [ ] 4.4 Criar `UsuarioMusicaEndpoints.cs` (1-Services/Endpoints) com `GET /api/v1/usuarios-musica`
- [ ] 4.5 Mapear endpoint no `Program.cs` (ou extensão `MapIdentificacaoEndpoints`)
- [ ] 4.6 Teste unitário do handler (filtra ATIVO, min 2 chars, pagina 10)
- [ ] 4.7 Teste de integração do endpoint (projeção populada → retorna resultados)

## Sequenciamento

- Bloqueado por: 3.0 (projeção + repo devem existir)
- Desbloqueia: 7.0 (frontend consome este endpoint)
- Paralelizável: Sim (após 3.0; paralelo com 5.0)

## Detalhes de Implementação

**Skills de referência:** `dotnet-architecture` (CQRS nativo: Query record `: IQuery<T>`, `IQueryHandler<T,Q>`, Dispatcher), `dotnet-testing`.

**Query (padrão existente):**
```csharp
public record BuscarUsuariosMusicaQuery(string? Q, string? Cnpj, int Page, int Size) : IQuery<UsuarioMusicaListResponse>;
```

**Handler:** injeta `IUsuarioMusicaSnapshotRepository`; valida `Q.Length >= 2` (senão retorna vazio); delega `BuscarAsync`. Mapeia para `UsuarioMusicaSnapshotResponse`.

**Query EF (repo):**
```csharp
var query = _dbSet.AsNoTracking()
    .Where(u => u.Status == "ATIVO")
    .Where(u => q.Length >= 2 && u.RazaoSocial.ToLower().Contains(q.ToLower()));
if (!string.IsNullOrEmpty(cnpj))
    query = query.Where(u => u.Cnpj == cnpj);
return await query.OrderBy(u => u.RazaoSocial)
    .Skip((page - 1) * size).Take(size).ToListAsync(ct);
```

**Endpoint (Minimal API, molde `CaptacaoEndpoints`):** usar `RequireIdentificacaoPermission(...)` com permissão de leitura existente ou nova constante.

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Endpoints de API
- Código existente: `CaptacaoEndpoints.cs` (molde Minimal API + `RequireIdentificacaoPermission`)
- Código existente: `ListarCaptacoesQueryHandler.cs` (molde de query handler + paginação)
- `dotnet-architecture`: CQRS nativo, record queries, Dispatcher

### Pontos Críticos

- Filtro `status == "ATIVO"` é obrigatório (usuários INATIVOS não aparecem na busca).
- Min 2 caracteres — query com 0-1 caractere retorna vazio (evita varredura full-table).
- Sem chamada HTTP à Arrecadação (RF-03: busca funciona com Arrecadação indisponível).

### Fora de Escopo

- Autocomplete no frontend (task 7.0).
- Mudança da Captação (task 5.0).

## Criterios de Sucesso

- `GET /api/v1/usuarios-musica?q=radio` retorna 200 com usuários ATIVOS cuja razão social contém "radio", máx 10.
- `GET /api/v1/usuarios-musica?q=r` retorna lista vazia (min 2 chars).
- `dotnet test --filter "FullyQualifiedName~BuscarUsuariosMusicaQueryHandler"` verde.
- Busca funcional sem a Arrecadação em execução (consulta só a projeção local).
