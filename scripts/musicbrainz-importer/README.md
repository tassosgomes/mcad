# MusicBrainz Importer (via REST API)

Este diretório contém a estrutura para popular a `cadastro-api` consumindo diretamente a **API Pública do MusicBrainz** (sem necessidade de baixar o banco de dados de 6GB).

⚠️ **ATENÇÃO AO RATE LIMIT:**
A API do MusicBrainz permite no máximo **1 requisição por segundo**. Os scripts possuem um `sleep` interno de 1.1s a 1.5s entre as chamadas para respeitar esse limite. Isso torna o processo de importação lento por natureza, o que é ideal para popular algumas dezenas/centenas de registros para testes locais.

## Passo a Passo

### 1. Subir o Container do Importador
Execute o Docker Compose para subir o ambiente Node.js na rede do Docker. (Você também pode rodar diretamente o `node` no seu terminal host, se preferir).

```bash
docker compose up -d
```

### 2. Configurar o JWT Token
Abra o arquivo `docker-compose.yml` (ou configure no seu host) e substitua `COLOQUE_SEU_TOKEN_AQUI` por um token JWT válido gerado pela sua aplicação (ele deve conter as permissões necessárias como `cadastro:default:obra:gerar-iswc`, etc).
Se editar o `docker-compose.yml`, rode `docker compose up -d` novamente para recarregar as variáveis.

### 3. Executar os Scripts
Abra um terminal dentro do container Node.js e execute os scripts na ordem:

```bash
# Entrar no container do Node (importer)
docker exec -it mcad-mb-importer sh

# Rodar 1: Busca algumas Obras no MB, extrai os Compositores, cadastra os Titulares e as Obras.
npm start

# Rodar 2: Chama sua API para gerar o ISWC para as Obras cadastradas (Libera a obra).
npm run gerar-iswc

# Rodar 3: Baseado nas Obras cadastradas, busca Gravações no MB, cria Intérpretes e Fonogramas.
npm run importar-fonogramas

# Rodar 4: Aprova e libera os Fonogramas na sua API.
npm run liberar-fonogramas
```
