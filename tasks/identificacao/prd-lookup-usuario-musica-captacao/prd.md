# PRD — Lookup de Usuário de Música em Captações (Event-Driven ACL)

> **Domínios envolvidos:** D02 Identificação (consumidor/owner), D03 Arrecadação (produtor)
> **Feature:** Substituir o campo de texto livre "Usuário de Música" na criação/edição/filtro de Captações por um lookup contra uma projeção local mantida via eventos da Arrecadação.
> **Status:** `prd-ready`
> **Prioridade:** Must Have

---

## Visão Geral

Hoje, ao criar ou editar uma captação na Identificação, o campo **Usuário de Música** é um texto livre (`varchar` de até 255 caracteres). Isso permite digitação arbitrária, gerando inconsistências, duplicidade de nomes, falta de integridade referencial e impossibilidade de rastrear a qual licenciado real a captação se refere — embora a Arrecadação seja a fonte de verdade de Usuários de Música.

Esta feature elimina a digitação livre: o Analista passa a **buscar e selecionar** um Usuário de Música existente. Para preservar o isolamento entre os dois microsserviços (sem acoplamento runtime via HTTP), a Identificação mantém uma **projeção local** (recorte: id, razão social, CNPJ, status) alimentada por **eventos de domínio** publicados pela Arrecadação a cada mudança no ciclo de vida do Usuário de Música. A busca consulta apenas a projeção local, tornando o SLA da Identificação independente da disponibilidade da Arrecadação.

Este é o mesmo padrão já adotado pelo projeto para sincronização de Rubricas entre domínios (`arrecadacao.rubrica.criada/atualizada`), estendido agora para Usuários de Música.

## Objetivos

- **Eliminar a digitação livre** do campo Usuário de Música em captações, garantindo que todo valor selecionado corresponda a um licenciado real cadastrado na Arrecadação.
- **Garantir integridade referencial** armazenando o identificador (`usuarioMusicaId`) do Usuário de Música, além de um snapshot do nome para exibição resiliente.
- **Preservar o isolamento** entre Identificação e Arrecadação: nenhuma chamada HTTP síncrona cross-domain no fluxo de busca/criação de captação.
- **Habilitar reuso futuro**: os eventos publicados carregam o payload completo do Usuário de Música, permitindo que outros domínios consumam o mesmo contrato sem alterar a Arrecadação.

### Métricas de Sucesso
- 100% das captações novas/edições possuem um `usuarioMusicaId` válido (zero textos livres).
- Latência da busca de usuário de música no formulário ≤ 300 ms (consulta local).
- A indisponibilidade da Arrecadação não impede a criação/edição de captações cuja busca já retorne resultados da projeção local.

## Histórias de Usuário

- **Como Analista de Identificação**, eu quero buscar um Usuário de Música por nome ao criar/editar uma captação, para que a captação fique vinculada ao licenciado correto e rastreável.
- **Como Analista de Identificação**, eu quero filtrar a lista de captações por Usuário de Música, para que eu encontre rapidamente todas as captações de um mesmo licenciado.
- **Como Arquiteto**, eu quero que a integração entre Identificação e Arrecadação seja orientada a eventos, para que a disponibilidade da Identificação não dependa da Arrecadação e o acoplamento runtime seja zero.
- **Como Consumidor futuro (outro domínio)**, eu quero receber o snapshot completo do Usuário de Música nos eventos, para que eu consuma apenas o recorte que me interessa sem exigir mudanças na Arrecadação.

## Funcionalidades Principais

### RF-01 — Publicação de eventos de Usuário de Música (Arrecadação — Produtor)
A Arrecadação publica eventos de integração no Outbox (mesma transação do comando) em todas as operações de ciclo de vida do Usuário de Música: criação, atualização, ativação e inativação. O **payload carrega o snapshot completo** da entidade (id, razãoSocial, nomeFantasia, cnpj, status, endereço, contato, timestamps), seguindo o princípio de evento "fat" para reuso por múltiplos consumidores.

- **Given** um Usuário de Música é criado/atualizado/ativado/inativado na Arrecadação
- **When** a transação do comando é confirmada
- **Then** um evento CloudEvents é gravado no Outbox na mesma transação (`arrecadacao.usuario-musica.criado` na criação; `arrecadacao.usuario-musica.atualizado` em qualquer alteração posterior) com o payload completo do Usuário de Música
- **MoSCoW:** Must Have

### RF-02 — Projeção local de Usuário de Música (Identificação — Consumidor)
A Identificação mantém uma tabela de projeção (`usuario_musica_snapshot`) com o recorte necessário: `id`, `razao_social`, `cnpj`, `status`, `atualizado_em`. Um consumer RabbitMQ consome os eventos `arrecadacao.usuario-musica.criado` e `arrecadacao.usuario-musica.atualizado` e faz upsert idempotente na projeção (chave = `id`).

- **Given** um evento `arrecadacao.usuario-musica.criado` ou `atualizado` é entregue ao consumer da Identificação
- **When** o consumer processa o evento
- **Then** a projeção local é criada/atualizada com id, razão social, CNPJ e status extraídos do payload completo, de forma idempotente (reprocessamentos não geram duplicidade)
- **MoSCoW:** Must Have

### RF-03 — Endpoint de busca local de Usuários de Música (Identificação)
A Identificação expõe um endpoint de busca que consulta **apenas** a projeção local, retornando apenas usuários com `status = ATIVO`, paginado (size padrão 10), filtrável por razão social (mín. 2 caracteres) e, opcionalmente, por CNPJ.

- **Given** o Analista digita ao menos 2 caracteres no campo de busca
- **When** o frontend consulta o endpoint local
- **Then** retorna os Usuários de Música ATIVOS cuja razão social contém o termo, em no máximo 10 resultados, sem nenhuma chamada à Arrecadação
- **Given** a Arrecadação está indisponível
- **When** o Analista busca um usuário
- **Then** a busca funciona normalmente sobre a projeção local
- **MoSCoW:** Must Have

### RF-04 — Persistência da referência na Captação
A entidade Captação passa a armazenar `UsuarioMusicaId` (Guid, obrigatório) e `UsuarioMusicaNome` (string, snapshot denormalizado para exibição). O campo de texto livre atual é descontinuado. A migration limpa os dados fake existentes (módulo fora de produção).

- **Given** uma captação é criada/editada com um Usuário de Música selecionado
- **When** o comando é processado
- **Then** a captação persiste `usuarioMusicaId` (referência) + `usuarioMusicaNome` (snapshot do nome no momento da seleção)
- **Given** a Arrecadação está indisponível após a criação
- **When** a captação é exibida
- **Then** o nome do Usuário de Música é exibido a partir do snapshot denormalizado
- **MoSCoW:** Must Have

### RF-05 — Autocomplete no formulário de criar/editar captação
O campo de texto livre no `CaptacaoForm` é substituído por um componente Autocomplete (com debounce) que consulta o endpoint local (RF-03). A seleção popula `usuarioMusicaId` + `usuarioMusicaNome`. Reaproveita o padrão já existente no `LicencaForm`.

- **Given** o Analista está criando/editando uma captação
- **When** digita ≥ 2 caracteres no campo Usuário de Música
- **Then** vê a lista de usuários ATIVOS correspondentes (razão social + CNPJ) e seleciona um
- **Given** nenhum usuário é selecionado
- **When** tenta salvar
- **Then** a validação bloqueia o envio com mensagem "Selecione um usuário de música"
- **MoSCoW:** Must Have

### RF-06 — Filtro por Usuário de Música na lista de captações
O filtro da lista de captações (`CaptacaoFilters`) passa a oferecer busca por Usuário de Música via Autocomplete (mesmo endpoint local), substituindo qualquer filtro de texto livre.

- **Given** o Analista abre os filtros da lista de captações
- **When** busca e seleciona um Usuário de Música
- **Then** a lista é filtrada pelas captações vinculadas àquele `usuarioMusicaId`
- **MoSCoW:** Should Have

### RF-07 — Contrato do evento de Rol
O evento `identificacao.rol.fechado` passa a incluir o `usuarioMusicaId` (além do nome já enviado), para rastreabilidade cross-domain, mantendo compatibilidade retroativa (campo adicional opcional).

- **Given** um Rol é fechado
- **When** o evento `identificacao.rol.fechado` é publicado
- **Then** o payload inclui `usuarioMusicaId` e `usuarioMusicaNome`
- **MoSCoW:** Should Have

## Experiência do Usuário

- **Persona primária:** Analista de Identificação (uso diário).
- O Autocomplete apresenta razão social como texto principal e CNPJ como secundário, espelhando o padrão visual do `LicencaForm` (já familiar ao usuário no módulo Arrecadação).
- Estado vazio e de erro (projeção sem resultados) comunica claramente "Nenhum usuário encontrado. Verifique o cadastro na Arrecadação."
- Acessibilidade: campo com label associado, navegação por teclado no Autocomplete (setas + Enter), `aria-activedescendant`.

## Restrições Técnicas de Alto Nível

- **Integração exclusivamente assíncrona**: nenhum HTTP síncrono Identificação→Arrecadação no fluxo de busca/criação de captação (princípio de isolamento).
- **Eventos "fat"**: a Arrecadação publica o snapshot completo do Usuário de Música; a Identificação projeta apenas seu recorte. *(Detalhes de schema/payload ficam para a Tech Spec.)*
- **Idempotência**: o consumer deve tolerar reentregas (at-least-once) sem duplicidade — chave natural = `id`.
- **Consistência eventual**: um Usuário de Música recém-criado na Arrecadação pode levar de centenas de ms a poucos segundos para aparecer na busca da Identificação. Isto é aceitável para lookup.
- **Outbox Pattern**: eventos são gravados na mesma transação do comando na Arrecadação (já é o padrão do projeto).
- **Permissões**: o endpoint de busca local herda a autorização da Identificação; a seleção não exige permissões da Arrecadação (a projeção é read-only local).

## Não-Objetivos (Fora de Escopo)

- **Tela de detalhe da captação** não recebe link/cliável para o cadastro do Usuário de Música na Arrecadação.
- **Criação inline** de Usuário de Música a partir da Identificação (não existefrontend de criação cruzada).
- **Revalidação periódica** do snapshot denormalizado da Captação contra a projeção (não há job de reconciliação).
- **Endpoint automático de replay/snapshot** para backfill — o carregamento inicial da projeção é manual/one-shot (dados atuais são fake e descartáveis).
- **ACL HTTP síncrona** — explicitamente rejeitada em favor de isolamento via eventos.
- Sincronização de endereço/contato do Usuário de Música na Identificação (apenas id, razão social, CNPJ e status são projetados).

## Rastreabilidade

### Vision Doc
- **Objetivos atendidos:** demonstrar Event-Driven e isolamento entre contextos no domínio real (§1 Solução Proposta).
- **Mapa de dependências (§3):** estabelece que integrações cross-domain usam ACL/HTTP ou eventos; esta feature consolida o padrão **evento** para dado de referência, reduzindo a dependência runtime.
- **Non-Goals respeitados:** sistema auto-contido, sem integrações externas; não expande escopo global.
- **Glossário:** "Usuário de Música" (Arrecadação) e "Captação" (Identificação) usados conforme definição acordada.

### Domain Doc — Identificação (D02)
- **Feature aprimorada:** F01 — Gestão de Captações (`done` → aprimoramento).
- **Entidade afetada:** Captação — atributo "usuário de música (texto livre)" passa a referência com snapshot.
- **Regras referenciadas:** RN-07 (período definido manualmente — inalterada); não conflita com RN-01 a RN-12.

### Domain Doc — Arrecadação (D03)
- **Entidade:** Usuário de Música (fonte de verdade).
- **Extensão do catálogo de eventos (§7):** adiciona `arrecadacao.usuario-musica.criado` e `arrecadacao.usuario-musica.atualizado` (atualmente inexistentes — o domínio só publicava auditoria para esta entidade).
- **Precedente:** RN-08 (Rubrica propaga mudanças via eventos para domínios consumidores) — mesmo princípio aplicado ao Usuário de Música.

## Questões em Aberto

- **Backfill operacional:** definir na Tech Spec a forma exata do carregamento one-shot da projeção (script SQL, comando de bootstrap que republica o estado atual via Outbox, ou reentrada manual). Como os dados são fake, o risco é mínimo, mas o procedimento deve ser documentado.
- **Granularidade do evento de status:** confirmar se `atualizado` cobre adequadamente ativação/inativação (decisão atual: sim, payload completo carrega o novo `status`) ou se futuramente vale a pena um evento discreto de mudança de status.
- **Contrato do `rol.fechado`:** validar com o domínio Distribuição (D04) se o acréscimo de `usuarioMusicaId` no payload é consumido ou irrelevante — campo será adicionado como opcional para não quebrar consumidores existentes.

---

*Para gerar a Especificação Técnica, use a skill `techspec-creator`.*
