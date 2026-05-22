# Análise — "Retrato" do Cadastro no processamento por competência

> Documento de análise arquitetural. Não houve alteração de código.
> Data: 2026-05-19

## Problema

Hoje, ao realizar o processamento por competência (distribuição mensal), não há um
"retrato" de como estava o cadastro naquele momento. Para evitar inconsistências
causadas por alterações no cadastro durante o processamento de distribuição, seria
necessário impedir alterações no cadastro — o que é operacionalmente indesejável.
A pergunta: quais soluções viáveis evitam esse problema?

## Diagnóstico — o que acontece hoje

- **Rol e Verba já são "congelados"**: existem `distribuicao.snapshots_rol` e
  `distribuicao.snapshots_verba`, populadas pelos eventos `identificacao.rol.fechado`
  e `arrecadacao.verba.disponivel`. O `ProcessoDistribuicao` referencia ambos via
  `snapshot_rol_id` e `snapshot_verba_id`.
- **A titularidade NÃO é congelada**: `CalcularProcessoCommandHandler` chama
  `HttpCadastroOwnershipClient.buscarOwnership()` → `POST /api/v1/distribuicao/ownership-snapshot`
  no Cadastro **no momento do cálculo (on-demand)**. Nada é persistido. Não existe
  tabela `snapshots_ownership` nem campo `snapshot_ownership_id` no processo.
- **O cálculo é "tiro único"**: `CalcularProcessoCommandHandler.validarStatus()` só
  aceita `status == CRIADO`; `marcarCalculado()` move para `CALCULADO`. Não há
  recálculo in-place — o ownership é buscado uma vez e descartado após gerar os créditos.
- **A liberação de retidos usa dados ao vivo de propósito**:
  `CreditoRetidoLiberacaoService.preverLiberacoes()` consulta o Cadastro novamente —
  e isso está **correto**, porque um crédito retido em N deve ser reavaliado contra o
  cadastro *atualizado* em N+1.

Consequência: entre o fechamento do Rol e o cálculo — e entre `CALCULADO` e `APROVADO` —
qualquer alteração de status de obra (`Bloquear`/`Desbloquear`), percentual ou
titularidade muda o resultado. Não há retrato, e o processo não é reproduzível nem
auditável. O endpoint se chama "snapshot", mas hoje é apenas uma *query ao vivo*.

## Opções viáveis

### Opção A — Snapshot de ownership na Distribuição (espelha o padrão existente)
Criar `distribuicao.snapshots_ownership` (com `payload` JSON, igual a `snapshots_rol`)
e o campo `snapshot_ownership_id` em `ProcessoDistribuicao`. No cálculo, persistir a
resposta do `ownership-snapshot`.
- **Aderência: altíssima.** É exatamente o padrão já usado para Rol e Verba. O endpoint
  já existe; falta só *persistir a resposta*.
- Mantém a autonomia dos bounded contexts (zero mudança no Cadastro).
- Dá o retrato auditável e torna o cálculo determinístico/reproduzível.

### Opção B — Versionamento temporal (bi-temporal) no Cadastro
Adicionar *effective dating* (`ValidoDe`/`ValidoAte`) a obras/titularidades; o
`ownership-snapshot` passaria a aceitar um parâmetro `asOf` (a competência).
- Conceitualmente o mais "correto" e reusável por qualquer consumidor.
- **Aderência: baixa/invasiva.** `TitularidadeAutoral`/`ParticipacaoConexa` hoje são
  imutáveis (só create/delete) — virariam versionadas. Migração pesada. *Overkill* se
  só a Distribuição precisa do retrato.

### Opção C — Reconstruir o estado a partir da auditoria
Já existe auditoria `DATA_CHANGE` com `before`/`after`. Reconstruir o cadastro via replay.
- **Aderência: baixa.** A auditoria vive em serviço/Oracle separado, é assíncrona
  (at-least-once, com lag) e não foi feita para *query* de reconstrução. Frágil e
  acoplada ao formato de evento. Serve como prova posterior, não como mecanismo funcional.

### Opção D — Congelar/bloquear o Cadastro durante o processamento
Marcar a competência como "em processamento" e o Cadastro rejeitar alterações.
- **Pior opção arquiteturalmente.** O Cadastro é *master data* de 4 domínios; não dá
  para congelá-lo globalmente. Congelar parcialmente exige saber o conjunto de obras
  *antes* (que só vem do Rol). Cria acoplamento temporal (Distribuição comandando o
  Cadastro), risco de *lock* órfão se o processo falhar, e a janela de processamento
  pode ser longa demais para travar o cadastro operacional.
- O snapshot (Opção A) resolve o mesmo problema sem precisar bloquear ninguém.

### Opção E — Snapshot materializado no próprio Cadastro
O Cadastro gera/guarda o snapshot por competência.
- **Aderência: média.** Coloca o conceito de "competência/ciclo de distribuição" dentro
  do Cadastro, que não o conhece. Competência é vocabulário da Distribuição — o snapshot
  deve morar lá.

### Opção F — Detecção de divergência (optimistic)
Não congela; registra um hash/versão do ownership usado e detecta se o cadastro mudou.
- Leve, mas **não entrega o "retrato"** — só detecta. Não resolve o pedido sozinha;
  funciona bem como complemento da Opção A.

## Comparativo

| Opção | Aderência à arquitetura | Esforço | Resolve o "retrato" | Mantém autonomia dos contextos |
|---|---|---|---|---|
| **A — Snapshot na Distribuição** | ★★★★★ | Baixo | Sim | Sim |
| B — Bi-temporal no Cadastro | ★★ | Alto | Sim | Sim |
| C — Replay da auditoria | ★★ | Médio | Parcial/frágil | Sim |
| D — Bloquear o Cadastro | ★ | Médio | Sim, com efeitos colaterais | Não |
| E — Snapshot no Cadastro | ★★★ | Médio | Sim | Não (vaza conceito) |
| F — Detecção de divergência | ★★★ | Baixo | Não (só detecta) | Sim |

## Recomendação

**Opção A.** É a única que se encaixa naturalmente: o sistema já provou esse padrão duas
vezes (`snapshots_rol`, `snapshots_verba`), o endpoint `ownership-snapshot` já existe e
retorna tudo o que é preciso — só falta **persistir a resposta** e ligá-la ao processo.
Ganha-se o retrato auditável e o cálculo reproduzível **sem bloquear o cadastro**. A
Opção F entra embutida como detecção de divergência opcional no `APROVAR`.

---

# Opção A — Proposta técnica detalhada

## 1. Resumo da mudança

Persistir, **no momento do cálculo**, a resposta do `ownership-snapshot` numa nova tabela
`distribuicao.snapshots_ownership`, espelhando o que já existe para `snapshots_rol` e
`snapshots_verba`. O `ProcessoDistribuicao` passa a referenciar esse snapshot via
`snapshot_ownership_id`, completando a tríade Rol + Verba + Cadastro como "retrato
congelado" do processo. Nenhuma alteração no Cadastro. Nenhum bloqueio operacional.

## 2. Modelo de dados — migration `V8__add_snapshots_ownership.sql`

```sql
-- Snapshots de Ownership (Cadastro) — retrato das titularidades usado no cálculo
CREATE TABLE distribuicao.snapshots_ownership (
    id                 UUID          PRIMARY KEY,
    rubrica_sigla      VARCHAR(20)   NOT NULL,
    periodo            VARCHAR(7)    NOT NULL,
    total_obras        INTEGER       NOT NULL DEFAULT 0,
    total_fonogramas   INTEGER       NOT NULL DEFAULT 0,
    payload            TEXT          NOT NULL,        -- JSON do OwnershipSnapshot
    payload_hash       CHAR(64)      NOT NULL,        -- SHA-256 do payload canônico
    capturado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_snapshots_ownership_rubrica_periodo
    ON distribuicao.snapshots_ownership (rubrica_sigla, periodo);

-- Processo referencia o snapshot (mesmo padrão de snapshot_rol_id / snapshot_verba_id)
ALTER TABLE distribuicao.processos
    ADD COLUMN snapshot_ownership_id UUID REFERENCES distribuicao.snapshots_ownership(id);
```

Decisões de schema:
- `payload TEXT` — idêntico a `snapshots_rol.payload`. O JSON é o `OwnershipSnapshot`
  de domínio (`obras[]` + `fonogramas[]` com status, categorias e percentuais).
- `payload_hash` — acréscimo barato que habilita a detecção de divergência (seção 9).
- Sem `UNIQUE(rubrica_sigla, periodo)` — cada processo terá seu próprio snapshot;
  a unicidade fica garantida pela cardinalidade 1:1 `processos.snapshot_ownership_id`.
- Direção da FK: `processos → snapshots_ownership`, espelhando `snapshot_rol_id`/
  `snapshot_verba_id`. Alternativa válida: `snapshots_ownership.processo_id → processos`.
- Coluna nasce nula; processos `CALCULADO` antigos não terão snapshot. Sem backfill.

## 3. Entidade de domínio `SnapshotOwnership`

Espelho fiel de `SnapshotRol.java`, em `distribuicao-domain/.../entities/`:

```java
@Entity
@Table(name = "snapshots_ownership", schema = "distribuicao")
public class SnapshotOwnership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false)
    private String rubricaSigla;

    @Column(nullable = false)
    private String periodo;

    @Column(name = "total_obras", nullable = false)
    private int totalObras;

    @Column(name = "total_fonogramas", nullable = false)
    private int totalFonogramas;

    @Column(name = "payload", columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "capturado_em", nullable = false)
    private Instant capturadoEm;

    protected SnapshotOwnership() {}

    private SnapshotOwnership(String rubricaSigla, String periodo, int totalObras,
                             int totalFonogramas, String payload, String payloadHash,
                             Instant capturadoEm) {
        this.rubricaSigla = rubricaSigla;
        this.periodo = periodo;
        this.totalObras = totalObras;
        this.totalFonogramas = totalFonogramas;
        this.payload = payload;
        this.payloadHash = payloadHash;
        this.capturadoEm = capturadoEm;
    }

    /** Factory: captura o retrato do Cadastro no instante do cálculo. */
    public static SnapshotOwnership capturar(String rubricaSigla, String periodo,
                                             int totalObras, int totalFonogramas,
                                             String payload, String payloadHash,
                                             Instant capturadoEm) {
        return new SnapshotOwnership(rubricaSigla, periodo, totalObras,
                totalFonogramas, payload, payloadHash, capturadoEm);
    }

    // getters...
}
```

## 4. Repositório

- Interface `SnapshotOwnershipRepository` (`distribuicao-domain`) — `findById`, `save`.
- `SpringDataSnapshotOwnershipRepository extends JpaRepository<SnapshotOwnership, UUID>`.
- `JpaSnapshotOwnershipRepository` — adapter, cópia estrutural de `JpaSnapshotRolRepository`.

## 5. Serialização do payload — `OwnershipPayloadSerializer`

Novo componente em `distribuicao-application/.../services/` (análogo ao `RolPayloadParser`):

```java
@Component
public class OwnershipPayloadSerializer {

    private final ObjectMapper objectMapper;

    public OwnershipPayloadSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    public String serialize(OwnershipSnapshot snapshot) { /* writeValueAsString */ }
    public OwnershipSnapshot deserialize(String payload) { /* readValue */ }
    public String hash(String payload) { return DigestUtils.sha256Hex(payload); }
}
```

> Atenção Jackson: para `deserialize` reconstruir os `record`s (`OwnershipSnapshot`,
> `ObraOwnership`, `ParticipacaoOwnership`, `FonogramaOwnership`), o módulo
> `jackson-module-parameter-names` precisa estar registrado — Spring Boot já o registra
> por padrão. Vale um teste de round-trip cobrindo isso.

## 6. Alteração em `ProcessoDistribuicao`

```java
@Column(name = "snapshot_ownership_id")
private UUID snapshotOwnershipId;

/** Vincula o retrato do Cadastro usado no cálculo. */
public void vincularSnapshotOwnership(UUID snapshotOwnershipId) {
    this.snapshotOwnershipId = snapshotOwnershipId;
}

public UUID getSnapshotOwnershipId() { return snapshotOwnershipId; }
```

`criar(...)` não muda — o ownership só é capturado no cálculo.

## 7. Alteração em `CalcularProcessoCommandHandler`

Ponto exato: entre o fim do `buscarOwnership` e o início do `calcular`. Tudo dentro do
`@Transactional` já existente — a persistência do snapshot fica atômica com os créditos.

Construtor: adicionar `SnapshotOwnershipRepository` e `OwnershipPayloadSerializer`.

```java
OwnershipSnapshot ownershipSnapshot = cadastroOwnershipClient.buscarOwnership(
        parsedRol.obraIds(), parsedRol.fonogramaIds(), command.bearerToken());

// --- NOVO: congela o retrato do Cadastro usado neste cálculo ---
String payload = ownershipPayloadSerializer.serialize(ownershipSnapshot);
SnapshotOwnership snapshotOwnership = snapshotOwnershipRepository.save(
        SnapshotOwnership.capturar(
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                ownershipSnapshot.obras().size(),
                ownershipSnapshot.fonogramas().size(),
                payload,
                ownershipPayloadSerializer.hash(payload),
                Instant.now()));
processo.vincularSnapshotOwnership(snapshotOwnership.getId());
// ---------------------------------------------------------------

ResultadoCalculo resultado = calculadoraCreditos.calcular(new CalculoCreditosInput(
        processo.getId(), snapshotVerba.getVerbaLiquida(),
        parsedRol.execucoes(), ownershipSnapshot));
```

O `processo` já é salvo adiante (`processoRepository.save(processo)`), então o
`snapshot_ownership_id` é persistido junto. A ordem (snapshot → processo) satisfaz a FK.

Auditoria: incluir `snapshotOwnershipId` no mapa `after` do evento `DATA_CHANGE`.

## 8. O que NÃO muda — e por quê

| Componente | Muda? | Razão |
|---|---|---|
| `CalculadoraCreditos` | Não | Já recebe `OwnershipSnapshot` pronto via `CalculoCreditosInput`. |
| `HttpCadastroOwnershipClient` / endpoint do Cadastro | Não | A captura reaproveita a chamada existente. |
| `CreditoRetidoLiberacaoService` | Não | A reavaliação de retidos **deve** continuar consultando o Cadastro ao vivo — é a mudança no cadastro que torna um retido elegível. Congelar quebraria a liberação. |
| `marcarCalculado(...)` | Não | `vincularSnapshotOwnership` é chamada separada. |

Ponto-chave do desenho: **snapshot congelado para o cálculo do processo; consulta ao
vivo para a liberação de retidos.** São necessidades opostas e ambas corretas.

## 9. Detecção de divergência (opcional, recomendado) — no `AprovarProcessoCommandHandler`

Entre `CALCULADO` e `APROVADO`, comparar o `payload_hash` armazenado com um hash de uma
busca fresca; se divergir, **alertar** (não bloquear) o analista — flag
`cadastroDivergente=true` na resposta da query de cálculo. Entrega a Opção F embutida,
sem custo de schema adicional.

## 10. Política de recálculo

Hoje não há recálculo in-place (guard `CRIADO`). Reprocessar exige `cancelar` + `criar` +
`calcular` — o novo processo gera naturalmente um novo snapshot.
- Sem feature nova: o snapshot é registro auditável/reprodutível. Suficiente.
- Se um recálculo in-place for adicionado depois: decidir explicitamente entre reusar o
  `snapshot_ownership_id` (determinístico) ou capturar novo (refresh explícito).
  Recomenda-se reusar por padrão.

## 11. Reprodutibilidade / auditoria

Com o payload guardado, a `ConsultarCalculoProcessoQuery` pode expor o snapshot, e fica
viável verificação independente: `deserialize(payload)` → `CalculadoraCreditos.calcular`
→ conferir os créditos. O retrato é a prova de "por que o titular X recebeu Y% naquela
competência".

## 12. Testes a ajustar

| Teste | Ajuste |
|---|---|
| `CalcularProcessoCommandHandlerTest` (unit) | Mockar `SnapshotOwnershipRepository.save()`; assertar `getSnapshotOwnershipId()`. |
| `CalcularProcessoCommandHandlerIntegrationTest` | Assertar linha em `snapshots_ownership` e FK no processo. |
| Novo `OwnershipPayloadSerializerTest` | Round-trip `serialize`→`deserialize` + estabilidade do `hash`. |
| `ProcessoDistribuicaoTest` | Cobrir `vincularSnapshotOwnership`. |
| `CreditoRetidoLiberacaoServiceTest` | Regressão: confirmar que continua usando ownership ao vivo. |

## 13. Ordem de implementação e esforço

1. Migration `V8` — schema. *(trivial)*
2. Entidade `SnapshotOwnership` + repositório. *(baixo — cópia de `SnapshotRol`)*
3. `OwnershipPayloadSerializer` + teste de round-trip. *(baixo)*
4. Campo + `vincularSnapshotOwnership` em `ProcessoDistribuicao`. *(trivial)*
5. Wire no `CalcularProcessoCommandHandler` + auditoria. *(baixo)*
6. (Opcional) detecção de divergência no `AprovarProcessoCommandHandler`. *(médio)*
7. Ajuste de testes. *(baixo–médio)*

Esforço total: **baixo**. Majoritariamente cópia estrutural de padrões já validados no
serviço. Mudança contida na `distribuicao-api` — zero impacto em Cadastro, Identificação,
Arrecadação ou frontend.

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Payload grande (muitas obras) infla a tabela | `TEXT` igual a `snapshots_rol`, que já guarda o rol inteiro. Comprimir só se medido. |
| `deserialize` falhar por record/Jackson | Teste de round-trip obrigatório; Spring Boot já registra o `parameter-names module`. |
| Hash instável (ordem de listas/mapas) | `OwnershipSnapshot` usa `List`; `ORDER_MAP_ENTRIES_BY_KEYS` cobre mapas. Para blindar, ordenar `obras`/`fonogramas` por id antes de serializar. |
| Chamada HTTP dentro da transação | Já é assim hoje. A persistência do snapshot só adiciona um `INSERT` local. |
| Processos `CALCULADO` legados sem snapshot | Coluna nullable; consumidores tratam `null` como "anterior à feature". Sem backfill. |

## Decisões em aberto

1. **Momento da captura**: no `CALCULAR` (recomendado) vs. no `CRIAR`.
2. **Detecção de divergência**: incluir ou não o alerta no `APROVAR`.
3. **Política de recálculo**: relevante apenas se um recálculo in-place for adicionado.
