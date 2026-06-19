# Plano de Testes QA — F06: Cancelamento e Recriação

**PRD:** `tasks/identificacao/prd-cancelamento-recriacao/prd.md`  
**Techspec:** `tasks/identificacao/prd-cancelamento-recriacao/techspec.md` + `techspec-frontend.md`  
**Ambiente:** Frontend `https://mcad.tasso.dev.br` | Backend `https://mcad-identificacao.tasso.dev.br/api/v1`  
**Banco:** Não  
**Relatório:** Markdown  

---

## TASKS IDENTIFICADAS

### qa_task_01_cancelar_rol_fechado — Cancelamento de Rol fechado (RF-01 + RF-02)
- **Tipo:** UI + API
- **Depende de:** nenhuma
- **Cenários:**
  1. Login com analista_identificacao
  2. Verificar botão "Cancelar Rol" visível em captação FECHADA
  3. Cancelar com justificativa válida — validar resposta (status CANCELADA, eventoPublicado: true)
  4. Justificativa vazia ou < 10 chars — rejeitado (400)
  5. Captação ABERTA — botão não visível
  6. Captação já CANCELADA — botão não visível / ação não disponível
  7. Bloqueio por distribuição (distribuicaoProcessada = true) — botão desabilitado

### qa_task_02_opcoes_recriacao — Opções de recriação (RF-03)
- **Tipo:** UI + API
- **Depende de:** qa_task_01
- **Cenários:**
  1. Opção A — Copiar execuções: nova captação ABERTA criada, execuções copiadas, redirecionamento
  2. Opção B — Recriar vazia: nova captação ABERTA sem execuções, redirecionamento
  3. Opção C — Apenas cancelar: nenhuma nova captação, retorna à listagem

### qa_task_03_feedback_visual_frontend — Feedback visual (RF-05)
- **Tipo:** UI
- **Depende de:** qa_task_01
- **Cenários:**
  1. Banner na captação CANCELADA (justificativa + data)
  2. Toast de sucesso após cancelamento
  3. Botão desabilitado com tooltip quando `distribuicaoProcessada = true`

---

## ORDEM DE EXECUÇÃO

```
Fase 1 (sequencial): qa_task_01_cancelar_rol_fechado
Fase 2 (paralelo):   qa_task_02_opcoes_recriacao, qa_task_03_feedback_visual_frontend
```

---

## EXCLUÍDO DO ESCOPO

- RF-01 critério 3 — Analista NÃO dono: foco apenas no fluxo principal do analista dono
- RF-05 critério 6 — Consultor sem botão Cancelar: foco apenas no analista
- RF-04 — Consumer distribuicao.rol.processado: coberto indiretamente via flag no pode-cancelar

---

## DIRETÓRIO DE EVIDÊNCIAS

```
tasks/identificacao/prd-cancelamento-recriacao/qa-evidence/
```
