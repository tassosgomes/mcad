# Dívida técnica — Frontend

Log de decisões adiadas conscientemente. Cada item descreve o problema, por que foi adiado e o que é preciso para resolver.

---

## DT-001 — Modelo de salvamento duplo nas telas de edição

**Status:** aberto · **Aberto em:** 2026-06-10 · **Prioridade:** alta (atacar em breve) · **Escopo:** cross-tela

### Problema
Telas de edição misturam dois modelos de salvamento na mesma página:

- **Save explícito** — um botão "Salvar" persiste um formulário (ex.: nome/descrição do papel em `RoleEditPage`).
- **Persist imediato** — listas associadas persistem no clique do próprio item, sem passar pelo "Salvar" (adicionar/remover permissão, atribuir/remover usuário em `RoleEditPage` / `RoleUsersTab`).

O usuário não consegue saber se uma ação numa lista já foi gravada ou se está pendente aguardando o "Salvar". É um conflito de modelo mental, não um bug visual. Observado em mais de uma tela; tratar como padrão, não caso isolado.

### Direção decidida
Unificar num **único Salvar**: nome, descrição, permissões e usuários viram estado pendente até o usuário confirmar. Exige:

- Estado pendente no front (diff de permissões/usuários a adicionar/remover).
- Barra "alterações não salvas" + ação Descartar.
- Disparo em lote no Salvar, com tratamento de **falha parcial** (ex.: 3 de 5 permissões gravam, 2 falham) e rollback/relatório claro.

### Por que foi adiado
Decisão de 2026-06-10: confiar no happy-path por enquanto. O refactor do estado pendente + falha parcial é grande e cross-tela; será atacado num esforço dedicado, em breve.

### Mitigação interim aplicada (2026-06-10)
Sem fechar o DT: em `RoleEditPage`, o botão "Salvar" virou **"Salvar identificação"** e há uma linha de ajuda ("Salvar grava apenas nome e descrição. Permissões e usuários são aplicados imediatamente."). Sinaliza o modelo ao usuário, mas o modelo duplo continua — a unificação ainda é o alvo.

### Referência
Crítica: `.impeccable/critique/2026-06-10T19-34-28Z__authz-papeis-acessos.md` (ponto P1 "Dois modelos de salvamento").

---

## DT-002 — Contagem de usuários por papel limitada a 200 assignments

**Status:** aberto · **Aberto em:** 2026-06-10 · **Prioridade:** baixa · **Escopo:** `RolesPage`, `RoleEditPage`

### Problema
A coluna "Usuários" da lista de papéis e o contador da aba Usuários derivam de `useAssignments({ size: 200 })` e contam no cliente. Com mais de 200 atribuições no total, a contagem subconta silenciosamente.

### Direção
Expor um endpoint de contagem por papel no BFF (`GET /api/acessos/assignments/count?roleKey=...` ou agregado) e consumir o número real, em vez de paginar e contar no front.

### Por que foi adiado
PoC com volume baixo de atribuições; o cap não se manifesta no uso atual. Exige mudança de backend.
