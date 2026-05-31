# Contrato de atores em historicos da Arrecadacao

Os endpoints historicos da Arrecadacao mantem os campos legados de autor e adicionam objetos opcionais com a identidade resolvida do ator. A mudanca e compativel: consumidores existentes podem continuar lendo `autor`, `criadoPor` e `estornadoPor`.

## Endpoints afetados

- `GET /api/v1/licencas/{id}/historico-status`
- `GET /api/v1/usuarios-musica/{id}/historico-status`
- `GET /api/v1/uda/vigente`
- `GET /api/v1/uda/historico`
- `GET /api/v1/pagamentos`
- `GET /api/v1/pagamentos/{id}`

## Campos novos

Historicos de Licencas e Usuarios de Musica:

```json
{
  "autor": "Maria Silva (maria.silva)",
  "ator": {
    "subject": "logto-user-1",
    "label": "Maria Silva (maria.silva)",
    "username": "maria.silva",
    "displayName": "Maria Silva",
    "email": "maria.silva@mcad.dev",
    "status": "ATIVO"
  }
}
```

UDA:

```json
{
  "criadoPor": "Maria Silva (maria.silva)",
  "criadoPorAtor": {
    "subject": "logto-user-1",
    "label": "Maria Silva (maria.silva)",
    "status": "ATIVO"
  }
}
```

Pagamentos estornados:

```json
{
  "estornadoPor": "Maria Silva (maria.silva)",
  "estornadoPorAtor": {
    "subject": "logto-user-1",
    "label": "Maria Silva (maria.silva)",
    "status": "ATIVO"
  }
}
```

## Status

- `ATIVO`: usuario encontrado na projecao `arrecadacao.usuarios_identidade`, sem suspensao e sem remocao.
- `SUSPENSO`: usuario encontrado com `is_suspended = true`.
- `REMOVIDO`: usuario encontrado com `deleted_at_utc` preenchido.
- `DESCONHECIDO`: registro antigo sem subject, projection ausente ou falha de lookup.

O `label` historico e congelado no momento da escrita e nao muda quando nome, login ou email forem atualizados na projecao. O status e resolvido no momento da leitura.

## Fallback e observabilidade

Quando a leitura recebe `subject` mas nao encontra projection local, o endpoint deve retornar o label congelado ou o campo legado e `status = "DESCONHECIDO"`. A leitura nao deve falhar por indisponibilidade de `usuarios_identidade`.

Logs esperados:

- `INFO` em `CurrentActorResolver` quando uma escrita usar autenticacao nao JWT e cair para `Authentication.getName()`.
- `WARN` em `ActorDisplayResolver` quando lookup individual ou em lote falhar ou quando o `subject` nao tiver projection.

Nao ha OpenAPI versionado no repositorio para estes endpoints; este arquivo registra o contrato minimo local da feature.
