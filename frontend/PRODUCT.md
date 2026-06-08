## Register

product

## Users

Três perfis técnicos internos do ECAD, sempre em desktop (monitores de escritório), autenticados via Keycloak:

- **Analistas de Cadastro / Identificação / Arrecadação** — operam diariamente sobre dados de titulares, obras, fonogramas, execuções, pagamentos e verbas. Passam horas em tabelas, formulários e fluxos transacionais. Querem velocidade, precisão e nenhum tropeço de UI.
- **Tech Leads e Arquitetos da plataforma** — usam o MCAD como referência arquitetural viva (API Composition, Schema-per-Service, CQRS, eventos). Olham a UI para entender como os padrões se manifestam, não só o resultado de negócio.
- **Desenvolvedores em onboarding** — chegam ao MCAD para aprender domínio (regulamento de distribuição do ECAD) e stack (.NET + Java + React + Keycloak + RabbitMQ) ao mesmo tempo.

Job-to-be-done principal: **operar um processo de gestão coletiva de direitos autorais** (cadastrar obras → identificar execuções → arrecadar licenças → distribuir créditos) usando a linguagem ubíqua do negócio, em uma interface que sirva tanto como ferramenta de trabalho quanto como exemplo arquitetural.

Workflow típico por tela: leitura/edição de dados de domínio (tabelas densas, formulários longos), inspeção de eventos e snapshots cross-contexto, e auditoria de ações por usuário e domínio.

## Product Purpose

O MCAD (mini-ECAD) é a **aplicação de referência** da plataforma ECAD: uma demonstração funcional ponta-a-ponta de quatro bounded contexts (Cadastro, Identificação, Arrecadação, Distribuição) implementados sob os padrões oficiais da plataforma — Schema-per-Service, Outbox + CloudEvents, BFF/API Composition, autenticação OIDC com Keycloak, autorização por permissions, auditoria estruturada.

O frontend é a janela do sistema: a única superfície que materializa a composição cross-domínio. Sucesso é uma analista conseguir conduzir um ciclo completo de distribuição sem precisar saber em qual microserviço o dado vive, e um arquiteto conseguir abrir qualquer tela e ler, no comportamento da UI, qual padrão da plataforma está sendo demonstrado.

Não é um produto comercial. Não vai para produção. Não compete com sistemas reais. É **living documentation** arquitetural com domínio real, escolhido porque exemplos genéricos (e-commerce, pedidos/estoque) não comunicam ao time como gestão coletiva de direitos autorais se modela.

## Brand Personality

Três palavras: **precisa, contida, autoritária.**

- **Precisa** — números alinhados em monospace, percentuais com casas decimais corretas, formulários que validam regras de negócio reais (soma de titularidades = 100%, splits 66,67/33,33). Cada elemento tem motivo.
- **Contida** — sem ornamentos, sem celebração, sem cores festivas. O sistema confia que a competência fala por si. Dark-first não como estética cool, mas como respeito aos olhos do analista que vai passar oito horas com a tela aberta.
- **Autoritária** — voz de documento técnico interno, não de marketing. Diz "Rol fechado" e "Verba bloqueada para distribuição em andamento", não "Tudo certo!" ou "Pronto para ir!".

Voz de copy: direta, em português do regulamento ECAD, sem buzzwords, sem "vamos lá", sem emojis em mensagens de sistema. O modelo mental é o de um changelog de engenharia bem escrito ou uma seção bem cuidada de man page — autoridade sem arrogância.

## Anti-references

O MCAD **não deve parecer**:

- **A estética do ECAD público (ecad.org.br)** — light theme institucional com azul claro, dourado e marrom. O MCAD é a contraparte interna, corporativa, escura; dividir paleta com o site público dilui a sinalização "ferramenta de engenharia".
- **Dashboards "gamer" / Cyberpunk-dark** — neons saturados (ciano, magenta, verde-tóxico), gradientes vivos, glassmorphism decorativo, glows roxos. Dark feito para "parecer hi-tech" em vez de servir leitura prolongada. Nosso dark é fosco, near-black, com um único acento azul corporativo.
- **Hero-metric SaaS B2B genérico** — números enormes com label minúscula, cards repetidos com ícone + heading + texto, gradientes pastel, eyebrows `ALL CAPS · 0.08em` em cima de cada seção. MCAD não vende, opera.

E especificamente proibidos por DESIGN.md (Circuit Core Dark): bordas 1px sólidas como separação visual, sombras cinza padrão, branco puro (#FFFFFF), gradientes decorativos, linhas divisoras quando whitespace resolve.

## Design Principles

1. **Living documentation, mostrada não explicada** — toda tela espelha um padrão arquitetural da plataforma (API Composition no BFF, eventos via Outbox, CQRS de leitura). A UI demonstra; não precisa de tooltip "explicando" que aquilo é CQRS. Um arquiteto que abre uma tela deve reconhecer o padrão pela forma como ela se comporta.

2. **Linguagem ubíqua do ECAD, em português, sem tradução** — obra, fonograma, titularidade, rubrica, verba líquida, rol de execuções, crédito retido. Nunca virar "pedidos", "itens", "ordens", "saldo disponível". O glossário do regulamento de distribuição é o vocabulário do produto e da UI.

3. **Densidade é serviço ao analista** — usuários passam horas na ferramenta; respeitamos isso aproveitando pixels com ritmo, não desperdiçando-os por reflexo de "ar". Tabelas largas, monospace para qualquer número, headers `uppercase + tracking 0.05em` (a única exceção de all-caps autorizada).

4. **Hierarquia por superfície, nunca por ornamento** — profundidade vem da pilha tonal de backgrounds (`bg-floor` → `bg-primary` → `bg-surface` → `bg-elevated` → `bg-highest`), não de bordas, sombras coloridas, gradientes ou glass. Quando sentir vontade de uma divider line, tentar `--space-4` de whitespace primeiro.

5. **Confiança técnica sobre marketing** — copy de changelog de engenharia: "Verba calculada", "Rol fechado", "Pendência cadastral retida". Sem buzzword, sem celebração, sem reticência tutorial. Estados de erro descrevem o que aconteceu e o que tentar; estados de sucesso são curtos e factuais.

## Accessibility & Inclusion

Meta formal: **WCAG 2.1 AA**.

- Contraste mínimo 4.5:1 para corpo (`--text-base`) e 3:1 para textos grandes (`≥18px` ou bold `≥14px`). Validar especialmente `--color-text-muted` (#8d90a0) sobre as cinco superfícies escuras — não usá-lo como cor de corpo em fundos elevados, só em metadados curtos sobre `--color-bg-floor` / `--color-bg-primary`.
- Foco visível obrigatório em todo elemento interativo. A regra "1px border é proibida exceto no focus state de input" do DESIGN.md já estabelece o canal; replicar para botões, links e menus.
- Navegação completa por teclado em fluxos transacionais (cadastro, registro de pagamento, fechamento de Rol, finalização de processo de distribuição).
- ARIA semântico em tabelas (escopo de header, role de rows), em modais (`role="dialog"`, focus trap, retorno de foco), em toasts (`role="status"` / `role="alert"` conforme severidade).
- Suporte a `prefers-reduced-motion`: toda transição com duração `>150ms` deve ter alternativa crossfade ou instantânea.
- Não depender de cor isolada para sinalizar estado: status (LIBERADO / BLOQUEADO / PENDENTE / RETIDO) sempre carrega texto explícito junto da cor.

Não há requisito formal de leitor de tela ou de tradução; o sistema é monolíngue (pt-BR) por escopo.
