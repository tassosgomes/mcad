---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>frontend/arrecadacao/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend - tipos de ator e componente compartilhado `ActorDisplay`

## Relacionada as User Stories

- [HU-01] Analista ve autor em formato humano
- [HU-02] Consultor nao precisa interpretar identificador tecnico

## Visao Geral

Criar a base de frontend para consumir o contrato enriquecido da API. A tarefa adiciona tipos TypeScript compartilhados e um componente reutilizavel `ActorDisplay` que renderiza o label congelado e status atual conhecido de forma legivel e acessivel.

## Requisitos

- Criar tipo `ActorDisplayResponse` no frontend.
- Atualizar tipos de Licenca, Usuario de Musica, UDA e Pagamento com campos opcionais de ator.
- Criar componente `ActorDisplay` reutilizavel em `frontend/src/features/arrecadacao`.
- Exibir `label` como texto visivel e selecionavel.
- Exibir status textual quando `SUSPENSO` ou `REMOVIDO`.
- Nao depender de tooltip como unica forma de acesso a informacao.
- Usar fallback para string legada quando objeto de ator nao vier no payload.
- Garantir layout responsivo sem truncar informacao essencial de forma irreversivel.

## Subtarefas

- [ ] 7.1 Criar/atualizar tipo TypeScript `ActorDisplayResponse`.
- [ ] 7.2 Atualizar `HistoricoStatusLicenca`, `HistoricoStatusUsuarioMusica`, `UdaValor` e `Pagamento`.
- [ ] 7.3 Criar componente `ActorDisplay` com props para `actor`, `fallbackLabel` e opcional de tamanho/contexto.
- [ ] 7.4 Criar CSS module com layout inline/wrap e badge textual para status.
- [ ] 7.5 Definir labels visuais para `SUSPENSO`, `REMOVIDO` e comportamento silencioso para `ATIVO`/`DESCONHECIDO`.
- [ ] 7.6 Testes de componente cobrindo label, fallback, status suspenso/removido e ausencia de tooltip obrigatorio.
- [ ] 7.7 Validar typecheck do frontend para os novos tipos.

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 8.0
- Paralelizavel: Sim (pode iniciar com o contrato definido na task 2.0)

## Rastreabilidade

- Esta tarefa cobre a experiencia de exibicao comum para todos os historicos da Arrecadacao.
- Evidencia esperada: componente isolado testado e tipos aceitando os campos opcionais adicionados pela API.

## Detalhes de Implementacao

Uso esperado:

```tsx
<ActorDisplay actor={item.ator} fallbackLabel={item.autor} />
```

Renderizacao sugerida:

- `Maria Silva (maria.silva)` quando ativo ou desconhecido;
- `Maria Silva (maria.silva) - Suspenso` quando `status === "SUSPENSO"`;
- `Maria Silva (maria.silva) - Removido` quando `status === "REMOVIDO"`.

Nao criar cards ou elementos decorativos para esse componente; ele deve caber em timelines, tabelas e paineis ja existentes.

## Criterios de Sucesso

- Tipos TypeScript refletem os novos campos opcionais da API.
- `ActorDisplay` funciona com objeto completo, fallback legado e status suspenso/removido.
- Testes de componente passam.
- Texto do autor permanece selecionavel e visivel.
