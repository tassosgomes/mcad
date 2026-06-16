---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>documentation/domains</domain>
<type>documentation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<risk>low</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>smoke</validation_level>
<context_budget>small</context_budget>
<dependencies>none</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 8.0: Documentação — Atualizar Domain Docs de Arrecadação e Identificação

## Visão Geral

Atualiza os documentos de domínio para refletir os novos eventos publicados pela Arrecadação (`arrecadacao.usuario-musica.criado/atualizado`) e a mudança na entidade Captação da Identificação (texto livre → referência com snapshot). Mantém a rastreabilidade da hierarquia de documentação sincronizada com a implementação.

## Requisitos

- `domains/arrecadacao/domain.md` §7: adicionar `arrecadacao.usuario-musica.criado` e `arrecadacao.usuario-musica.atualizado` no catálogo de eventos produzidos.
- `domains/identificacao/domain.md` §3: atualizar a entidade Captação — "usuário de música (texto livre)" → referência com snapshot denormalizado.
- `vision.md`: considerar nota no histórico de revisões (opcional).

## Subtarefas

- [ ] 8.1 Atualizar `domains/arrecadacao/domain.md` §7 (Produz): adicionar os 2 eventos com descrição e payload
- [ ] 8.2 Atualizar `domains/identificacao/domain.md` §3 (entidade Captação): ajustar descrição do atributo
- [ ] 8.3 Atualizar `domains/identificacao/domain.md` §5 (Depende de): documentar a nova dependência event-driven da Arrecadação (projeção de usuários de música via eventos)
- [ ] 8.4 (Opcional) Adicionar entrada no histórico de revisões do `vision.md`

## Sequenciamento

- Bloqueado por: 1.0 (eventos devem estar definidos para documentar)
- Desbloqueia: Nenhum
- Paralelizável: Sim (texto; paralelo a qualquer task após 1.0)

## Detalhes de Implementação

**Eventos a documentar (D03 §7 Produz):**
```
- `arrecadacao.usuario-musica.criado` — usuário de música criado. Identificação sincroniza projeção local. Contém: id, razaoSocial, nomeFantasia, cnpj, cnpjFormatado, status, timestamps
- `arrecadacao.usuario-musica.atualizado` — usuário de música atualizado/ativado/inativado. Mesmo payload completo (fat event)
```

**Entidade Captação (D02 §3):** trocar a descrição da coluna "usuário de música (texto livre)" por:
> `usuarioMusicaId` (Guid — referência ao Usuário de Música da Arrecadação), `usuarioMusicaNome` (snapshot denormalizado para exibição resiliente)

**Dependência (D02 §5 — Depende de):** adicionar entrada:
> Arrecadação — Projeção local de Usuários de Música (id, razão social, CNPJ, status) sincronizada via eventos `arrecadacao.usuario-musica.criado/atualizado`. Event-driven ACL, sem acoplamento HTTP runtime. Crítica: Alta.

## Contexto para Agentes

### Leitura Obrigatória

- PRD: §Rastreabilidade
- Domain docs existentes: `domains/arrecadacao/domain.md`, `domains/identificacao/domain.md`

### Fora de Escopo

- Mudar qualquer código.
- Reescrever domain docs — apenas atualizar as seções indicadas.

## Criterios de Sucesso

- `domains/arrecadacao/domain.md` §7 lista os 2 novos eventos.
- `domains/identificacao/domain.md` §3 descreve a Captação com `usuarioMusicaId` + `usuarioMusicaNome`.
- `domains/identificacao/domain.md` §5 documenta a dependência event-driven da Arrecadação.
