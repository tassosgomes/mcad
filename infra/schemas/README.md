# mcad — Schema Registry

Registry simples (nginx static) que serve os JSON Schemas de todos os eventos do mcad e oferece um explorador web (`index.html`) com listagem, visualizacao e validacao de payload em tempo real (Ajv 2020 carregado via esm.sh).

Catalogo descritivo completo: `docs/events.md`.

## Estrutura

```
infra/schemas/
├── Dockerfile        # nginx:alpine servindo os schemas
├── README.md         # este arquivo
├── index.html        # explorador web (sidebar + viewer + validador)
├── nginx.conf        # autoindex JSON em /v1/ + CORS
└── v1/               # 17 JSON Schemas (versao atual)
    ├── CadastroObraLiberada.json
    ├── CadastroObraBloqueada.json
    ├── CadastroObraDominioPublico.json
    ├── CadastroObraDepurada.json
    ├── CadastroFonogramaLiberado.json
    ├── CadastroFonogramaBloqueado.json
    ├── CadastroFonogramaDepurado.json
    ├── CadastroTitularCriado.json
    ├── IdentificacaoRolFechado.json
    ├── IdentificacaoRolCancelado.json
    ├── ArrecadacaoRubricaCriada.json
    ├── ArrecadacaoPagamentoRegistrado.json
    ├── ArrecadacaoPagamentoEstornado.json
    ├── DistribuicaoProcessoCalculado.json
    ├── IdentityUserUpserted.json
    ├── IdentityUserSuspended.json
    └── IdentityUserDeleted.json
```

## Como rodar

### Via docker compose (recomendado)

```bash
docker compose -f docker-compose.dev.yml up -d mcad-schema-registry
# abre em http://localhost:5310
```

### Build manual

```bash
cd infra/schemas
docker build -t mcad-schema-registry .
docker run --rm -p 5310:80 mcad-schema-registry
```

## Endpoints

- `GET /` — explorador web (index.html)
- `GET /v1/` — listagem JSON dos schemas (autoindex)
- `GET /v1/{Name}.json` — schema individual (CORS liberado)

## Convencoes dos contratos

- **Versao da pasta** (`v1/`, `v2/`, ...) sinaliza mudancas incompativeis. Mudancas backward-compatible (campos opcionais novos) ficam na mesma pasta.
- **Envelope CloudEvents 1.0** para eventos de dominio (cadastro, identificacao, arrecadacao, distribuicao). Campos: `specversion`, `id`, `source` (urn do servico), `type` (event type), `subject` (id da entidade), `time`, `datacontenttype`, `data`.
- **Envelope flat** para eventos de identidade (`identity.user.*`) — o identity-sync-api publica JSON puro com `eventId`, `eventType`, `occurredAt`, `source`, `user`, `metadata` no nivel raiz.
- **Nomenclatura de arquivo:** PascalCase com prefixo de dominio — `{Dominio}{Entidade}{Acao}.json` — para agrupar visualmente na sidebar e evitar colisao entre dominios.
- **$id:** `http://schema-registry/v1/{Name}.json` (URI logica; nao precisa ser resolvivel).

## Adicionar um novo evento

1. Atualize `docs/events.md` com o novo evento (produtor, payload, consumidores).
2. Crie o arquivo `infra/schemas/v1/{NovoEvento}.json` seguindo o padrao dos demais (envelope CloudEvents ou flat conforme o produtor).
3. Verifique a parse:
   ```bash
   python3 -c "import json; json.load(open('infra/schemas/v1/NovoEvento.json'))"
   ```
4. Suba/reinicie o registry:
   ```bash
   docker compose -f docker-compose.dev.yml up -d --build mcad-schema-registry
   ```
5. Confirme em `http://localhost:5310` que o evento apareceu na sidebar e que o payload gerado valida.

## Quebra de compatibilidade (v2)

Quando precisar publicar uma versao incompativel:

1. Crie `infra/schemas/v2/{Name}.json` com o novo contrato.
2. Mantenha `v1/{Name}.json` enquanto houver consumidores na versao antiga.
3. Adicione `location /v2/` no `nginx.conf` (espelhando o bloco de `/v1/`).
4. Documente o motivo da quebra e o caminho de migracao em `docs/events.md`.
