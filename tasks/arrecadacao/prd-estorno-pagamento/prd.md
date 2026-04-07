# PRD — F06: Estorno de Pagamento

> Domínio: Arrecadação (D03), Feature ID: F06, Prioridade: Must Have, Status: planned, Data: 2026-04-06

---

## 1. Contexto

O Registro de Pagamentos (F04) permite ao Analista lançar pagamentos em UDAs contra licenças ativas ou suspensas. O Cálculo de Verba Líquida (F05) agrega esses pagamentos por rubrica+período e disponibiliza a verba para distribuição. Contudo, pagamentos podem ser registrados incorretamente — valor errado, licença errada, duplicidade — e precisam ser cancelados.

O **Estorno de Pagamento** é o mecanismo de cancelamento: reverte o status do pagamento de CONFIRMADO para ESTORNADO, recalcula a verba líquida do período afetado e publica evento para que a Distribuição considere o ajuste. O estorno é total (não parcial), imediato (sem fluxo de aprovação) e exige justificativa obrigatória para rastreabilidade.

---

## 2. Rastreabilidade

| Referência | Descrição |
|------------|-----------|
| Domain Doc F06 | Estorno de Pagamento |
| RN-05 | Estorno publica evento para Distribuição |
| RN-01 | Verba líquida = 85% do bruto |
| RN-06 | Valores monetários em alta precisão decimal |
| F04 RN-P07 | Status inicial CONFIRMADO; transição para ESTORNADO é responsabilidade de F06 |
| F04 RN-P09 | Imutabilidade pós-registro; estorno é a única operação permitida |
| F05 RF-15 | Verba EM_DISTRIBUICAO ou DISTRIBUIDA bloqueia alterações |
| F05 RF-16 | Lock validado antes de estorno |

**Upstream:** F04 — Registro de Pagamentos (Pagamento deve existir e estar CONFIRMADO); F05 — Cálculo de Verba Líquida (recálculo e validação de lock)
**Downstream:** D04 — Distribuição (consome evento `arrecadacao.pagamento.estornado`)

---

## 3. Objetivos

- Permitir ao Analista cancelar pagamentos incorretos ou indevidos com rastreabilidade (justificativa obrigatória)
- Garantir consistência financeira: recálculo automático da verba líquida após estorno
- Proteger integridade da distribuição: bloquear estorno quando verba em uso pelo processo de distribuição
- Publicar evento `arrecadacao.pagamento.estornado` via Outbox Pattern (CloudEvents 1.0)
- Liberar o slot de unicidade (licença+período) para permitir novo registro após estorno

---

## 4. Extensão da Entidade Pagamento

O estorno adiciona 3 campos à entidade Pagamento existente (F04):

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| justificativaEstorno | string (10-500 chars) | Motivo do cancelamento. Obrigatório no momento do estorno |
| estornadoPor | string | Username do autor do estorno |
| estornadoEm | datetime | Timestamp do momento do estorno |

Esses campos são `null` enquanto o pagamento está CONFIRMADO e preenchidos de forma imutável no momento do estorno.

---

## 5. Regras de Negócio

**RN-E01 — Apenas CONFIRMADO:** Somente pagamentos com status CONFIRMADO podem ser estornados. Tentativa de estornar um pagamento já ESTORNADO deve retornar erro 422.

**RN-E02 — Justificativa obrigatória:** A justificativa deve ter no mínimo 10 caracteres e no máximo 500 caracteres.

**RN-E03 — Bloqueio por verba em distribuição:** O estorno é bloqueado se a verba do rubrica+período correspondente estiver com status EM_DISTRIBUICAO ou DISTRIBUIDA. O sistema deve retornar erro 422 com mensagem clara indicando que a verba está em processo de distribuição.

**RN-E04 — Recálculo automático:** Após o estorno, a verba líquida do rubrica+período é recalculada: soma apenas os pagamentos com status CONFIRMADO restantes e aplica a dedução de 15% (10% ECAD + 5% associações).

**RN-E05 — Verba zero:** Se todos os pagamentos do período forem estornados, a verba líquida vai a zero. O evento `arrecadacao.verba.disponivel` é publicado mesmo com valor zero.

**RN-E06 — Liberação de unicidade:** O estorno libera a constraint de unicidade parcial `(licenca_id, periodo) WHERE status = 'CONFIRMADO'`, permitindo que um novo pagamento CONFIRMADO seja registrado para a mesma licença+período.

**RN-E07 — Evento transacional:** O evento `arrecadacao.pagamento.estornado` é publicado via Outbox Pattern na mesma transação que o save do pagamento estornado e o recálculo da verba, garantindo consistência at-least-once.

**RN-E08 — Apenas Analista:** Somente o perfil Analista de Arrecadação pode realizar estornos. Consultor recebe erro 403.

**RN-E09 — Imutabilidade dos dados de estorno:** Uma vez preenchidos, os campos `justificativaEstorno`, `estornadoPor` e `estornadoEm` não podem ser alterados.

---

## 6. Histórias de Usuário

### HU-01 — Estornar pagamento

**Como** Analista de Arrecadação,
**Quero** estornar um pagamento confirmado informando justificativa,
**Para que** o valor seja revertido e a verba líquida do período seja recalculada corretamente.

**Critérios de Aceitação:**

```
Dado que sou Analista autenticado
  E o pagamento possui status CONFIRMADO
  E a verba do rubrica+período está com status ABERTA
  E forneço justificativa com 10-500 caracteres
Quando submeto POST /pagamentos/{id}/estornar
Então o pagamento é atualizado para ESTORNADO
  E os campos justificativaEstorno, estornadoPor e estornadoEm são preenchidos
  E a verba líquida do período é recalculada
  E o evento arrecadacao.pagamento.estornado é publicado via Outbox
  E retorno 200 com o pagamento atualizado

Dado que o pagamento já possui status ESTORNADO
Quando submeto a requisição
Então recebo erro 422: "Pagamento já foi estornado"

Dado que a verba do período está com status EM_DISTRIBUICAO ou DISTRIBUIDA
Quando submeto a requisição
Então recebo erro 422: "Não é possível estornar pagamento com verba em distribuição"

Dado que a justificativa tem menos de 10 caracteres
Quando submeto a requisição
Então recebo erro 400 com detalhes do campo inválido

Dado que sou Consultor
Quando tento estornar
Então recebo erro 403
```

### HU-02 — Consultar pagamento estornado

**Como** Analista ou Consultor,
**Quero** ver os detalhes de um pagamento estornado incluindo justificativa e dados do estorno,
**Para que** eu possa auditar os cancelamentos realizados.

**Critérios de Aceitação:**

```
Dado que estou autenticado
  E o pagamento possui status ESTORNADO
Quando acesso GET /pagamentos/{id}
Então recebo o pagamento com dados expandidos incluindo:
  - justificativaEstorno, estornadoPor, estornadoEm
  - Todos os campos originais (licença, UDAs, valor, período)

Dado que o pagamento possui status CONFIRMADO
Quando acesso GET /pagamentos/{id}
Então os campos justificativaEstorno, estornadoPor e estornadoEm são null
```

---

## 7. Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-01 | O sistema deve permitir estorno apenas de pagamentos CONFIRMADOS |
| RF-02 | O sistema deve exigir justificativa com 10-500 caracteres |
| RF-03 | O sistema deve bloquear estorno quando verba do período está EM_DISTRIBUICAO ou DISTRIBUIDA |
| RF-04 | O sistema deve recalcular a verba líquida do rubrica+período após estorno |
| RF-05 | O sistema deve publicar evento `arrecadacao.pagamento.estornado` via Outbox na mesma transação |
| RF-06 | O sistema deve registrar autor e timestamp do estorno no pagamento |
| RF-07 | O sistema deve liberar a unicidade (licença+período) para novo registro após estorno |
| RF-08 | O sistema deve retornar pagamento com dados de estorno na consulta GET /pagamentos/{id} |
| RF-09 | O sistema deve publicar `arrecadacao.verba.disponivel` atualizado mesmo quando verba é zero |

---

## 8. Não-Escopo (Non-Goals)

- **Estorno parcial** — reverter parte das UDAs de um pagamento
- **Fluxo de aprovação** — estorno pendente aguardando aprovação de gestor
- **Histórico de tentativas** — registrar tentativas rejeitadas de estorno
- **Estorno com verba distribuída** — permitir estorno com crédito negativo compensatório
- **Notificações** — email ou push sobre estornos realizados
- **Relatório dedicado** — filtro na listagem existente (F04) é suficiente
- **Estorno em lote** — estornar múltiplos pagamentos de uma vez

---

## 9. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Estorno total vs parcial | Total | Simplificação para PoC; estorno parcial adicionaria complexidade significativa |
| Fluxo de aprovação | Imediato | Consistente com padrão da PoC (licença também não tem aprovação) |
| Campos de estorno | 3 campos no Pagamento | Mais simples que entidade separada; auditabilidade via campos imutáveis |
| Lock de verba | Validação antes do estorno | Reutiliza mecanismo de lock do F05 (RF-15/RF-16) |
| Recálculo | Reutiliza serviço de cálculo do F05 | Evita duplicação de lógica de 85% bruto |
| Evento Outbox | Mesma transação | Garantia at-least-once: evento só existe se estorno persistiu |
| Prazo para estorno | Sem restrição | Lock de verba é proteção suficiente; simplicidade |

---

## 10. Modelo de Dados (Extensão)

```sql
-- Extensão da tabela arrecadacao.pagamento (F04)
ALTER TABLE arrecadacao.pagamento
    ADD COLUMN justificativa_estorno VARCHAR(500),
    ADD COLUMN estornado_por VARCHAR(200),
    ADD COLUMN estornado_em TIMESTAMPTZ;
```

---

## 11. Evento de Domínio

### arrecadacao.pagamento.estornado (CloudEvents 1.0)

```json
{
  "specversion": "1.0",
  "type": "arrecadacao.pagamento.estornado",
  "source": "/arrecadacao/pagamentos",
  "id": "evt-uuid-aqui",
  "time": "2026-04-06T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "pagamentoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "licencaId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "rubricaSigla": "RADIO",
    "periodo": "2026-04",
    "quantidadeUdas": "5.500000",
    "valorEstornado": "590.205000",
    "justificativa": "Pagamento registrado em duplicidade",
    "verbaLiquidaAtualizada": "450.000000",
    "estornadoPor": "analista@ecad.org.br",
    "estornadoEm": "2026-04-06T10:00:00Z"
  }
}
```

---

## 12. User Experience

### Página de Detalhes do Pagamento (extensão do F04)

**Quando CONFIRMADO + Analista:**
- Botão "Estornar" visível no rodapé da página
- Ao clicar: modal de confirmação com resumo do pagamento, campo de justificativa (textarea, min 10 chars), botão "Confirmar Estorno" (vermelho) e botão "Cancelar"
- Após sucesso: toast "Pagamento estornado com sucesso", página recarrega com status ESTORNADO

**Quando ESTORNADO:**
- Badge vermelho "ESTORNADO" (já implementado no F04)
- Card adicional "Dados do Estorno": justificativa, autor, data/hora
- Botão "Estornar" não aparece

**Quando Consultor:**
- Botão "Estornar" nunca aparece (read-only)

**Tratamento de erros no frontend:**
- 422 (já estornado): toast "Este pagamento já foi estornado"
- 422 (verba em distribuição): toast "Não é possível estornar — verba em processo de distribuição"
- 400 (justificativa inválida): validação inline no campo

---

## 13. Métricas de Sucesso

| Métrica | Critério |
|---------|----------|
| Estorno funcional | POST /pagamentos/{id}/estornar retorna 200 com pagamento ESTORNADO |
| Recálculo automático | Verba líquida do período recalculada corretamente após estorno |
| Bloqueio por lock | Estorno rejeitado (422) quando verba EM_DISTRIBUICAO ou DISTRIBUIDA |
| Evento publicado | `arrecadacao.pagamento.estornado` salvo no Outbox na mesma transação |
| Re-registro | Após estorno, novo pagamento CONFIRMADO registrado para mesma licença+período |
| Auditabilidade | Pagamento estornado exibe justificativa, autor e data |
| Segurança | Consultor recebe 403 ao tentar estornar |
