---
status: pending
parallelizable: true
blocked_by: ["13.0", "6.0", "7.0", "8.0", "9.0"]
---

<task_context>
<domain>frontend/portal</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"16.0"</unblocks>
</task_context>

# Tarefa 14.0: Frontend — Páginas do Titular

## Visão Geral

Implementar todas as páginas do Portal do Titular: auto-cadastro, login, dashboard, gestão de contato (com auto-preenchimento ViaCEP), consulta de repertório, ocorrências e solicitações de alteração (com aviso de janela de distribuição RF-21). Seguir a estrutura feature-sliced existente (`features/{domain}/{aggregate}/`).

## Requisitos

- Todas as HU-01 a HU-07 e RF-01 a RF-32 (lado titular)
- PRD — seção *Experiência do Usuário* (fluxos)
- Tech Spec — seção *ViaCEP* e *Considerações de UI*

## Subtarefas

- [ ] 14.1 Criar `features/portal/auth/pages/PortalLoginPage.tsx` — formulário CPF/CNPJ + senha. Mensagem de erro genérica ("Credenciais inválidas"). Link para auto-cadastro. Em caso de sucesso, redireciona para `/portal`.
- [ ] 14.2 Criar `features/portal/auth/pages/AutoCadastroPage.tsx` — formulário CPF/CNPJ + CAE/IPI + senha. Mensagens orientando que o titular deve já existir no ECAD. Em caso de sucesso, redireciona para login.
- [ ] 14.3 Criar `features/portal/dashboard/PortalDashboardPage.tsx` — visão geral: cards resumo (minhas obras, meus fonogramas, ocorrências abertas, solicitações pendentes). Links rápidos.
- [ ] 14.4 Criar `features/portal/contato/pages/ContatoPage.tsx` — formulário de edição de e-mail, endereço e telefones (múltiplos, com tipo). **Auto-preenchimento ViaCEP:** ao perder o foco do campo CEP, fazer `GET https://viacep.com.br/ws/{cep}/json/` e preencher logradouro, bairro, cidade (localidade), uf, complemento. Tratar `{ "erro": true }` como não-encontrado (campos editáveis manualmente). Validação de formato no submit (e-mail, CEP 8 dígitos, UF). Cap de 5 telefones.
- [ ] 14.5 Criar `features/portal/repertorio/pages/RepertorioPage.tsx` — duas abas/tabs: "Minhas Obras" e "Meus Fonogramas". Tabelas com título, categoria/ISRC, percentual. Filtro por título e ordenação (RF-26). Somente leitura. Botão "Reportar erro" em cada linha → leva ao formulário de ocorrência pré-preenchido com obra/fonograma.
- [ ] 14.6 Criar `features/portal/ocorrencias/` — feature completa:
  - `pages/OcorrenciasPage.tsx` — lista de ocorrências do titular com filtro por status (badges `ABERTA`/`EM_ANALISE`/`RESOLVIDA`/`CANCELADA`), resolução visível (RF-30).
  - `pages/AbrirOcorrenciaPage.tsx` — formulário (tipo, obra/fonograma referenciado opcional, descrição). Pré-preenchido quando vem do botão "Reportar erro" da página de repertório.
  - `api/ocorrenciasApi.ts`, `hooks/useOcorrencias.ts`, `types/ocorrencia.ts`.
- [ ] 14.7 Criar `features/portal/solicitacoes/` — feature completa:
  - `pages/SolicitacoesPage.tsx` — lista de solicitações do titular com status (`SOLICITADA`/`APROVADA`/`REJEITADA`) e justificativa de rejeição.
  - `pages/AbrirSolicitacaoPage.tsx` — formulário (campo, valor pretendido, justificativa). **RF-21:** se o campo for `ASSOCIACAO`, exibir aviso informativo: "Se houver distribuição em curso, esta alteração será considerada apenas no próximo processamento" (não bloqueia o submit). **RF-20:** o campo de associação de destino é obrigatório (não aceita vazio).
  - `api/solicitacoesApi.ts`, `hooks/useSolicitacoes.ts`, `types/solicitacao.ts`.
- [ ] 14.8 Usar TanStack Query para fetching (padrão existente em `features/cadastro/titulares/hooks/`). Tratamento de erro com `ProblemDetails` (formato RFC 7807 do backend).
- [ ] 14.9 Acessibilidade: rótulos ARIA, navegação por teclado, contraste conforme `DESIGN.md`. Badges de status com cores semânticas.
- [ ] 14.10 Testes (Vitest + React Testing Library + MSW onde aplicável): render de formulários, validação client-side, fluxo de submit (mockado).

## Sequenciamento

- Bloqueado por: 13.0 (infra do portal), 6.0, 7.0, 8.0, 9.0 (endpoints backend)
- Desbloqueia: 16.0 (testes E2E)
- Paralelizável: Sim (paralelo a 15.0 — páginas do analista)

## Detalhes de Implementação

**ViaCEP (apenas frontend):**

```typescript
async function buscarCep(cep: string) {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
  const data = await res.json();
  if (data.erro) return null;
  return {
    logradouro: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    uf: data.uf,
    complemento: data.complemento,
  };
}
```

Chamar no `onBlur` do campo CEP. ViaCEP bloqueia uso massivo — uma chamada por CEP é aceitável.

**Estrutura de feature** (seguir `features/cadastro/titulares/`):
```
features/portal/{aggregate}/
├── api/{aggregate}Api.ts
├── components/
├── hooks/use{Aggregate}.ts
├── pages/
├── types/{aggregate}.ts
└── index.ts
```

**Badges de status:** usar o componente de Badge existente (ou criar um simples). Cores: `ABERTA` (azul), `EM_ANALISE` (âmbar), `RESOLVIDA` (verde), `CANCELADA` (cinza).

## Critérios de Sucesso

- Titular consegue se cadastrar, logar e navegar pelo portal (HU-01, HU-02).
- Edição de contato com auto-preenchimento ViaCEP funciona (HU-03).
- Abertura de solicitação exibe o aviso de janela para associação e exige destino (HU-04, RF-20, RF-21).
- Consulta de obras/fonogramas mostra apenas repertório do titular (HU-05, RF-24).
- Abertura e acompanhamento de ocorrências funcional (HU-06, HU-07).
- `npm run build` (type-check + build) passa.
- `npm run lint` passa.
