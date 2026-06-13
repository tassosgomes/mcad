---
status: pending
parallelizable: false
blocked_by: ["5.0", "8.0"]
---

<task_context>
<domain>distribuicao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks></unblocks>
</task_context>

# Tarefa 9.0: Testes de integracao (DemonstrativoControllerIntegrationTest)

## Visao Geral

Implementa o teste de integracao end-to-end usando Testcontainers PostgreSQL. Insere dados reais no banco (processo + creditos de dois titulares nos tres status) e verifica os endpoints HTTP do `DemonstrativoController`. Esta e a ultima tarefa de backend.

## Requisitos

- Usar Testcontainers PostgreSQL (padrao ja adotado no projeto)
- Se o Docker engine nao estiver disponivel na CI: usar `@DisabledIfSystemProperty` (padrao existente no modulo)
- Inserir processo FINALIZADO + creditos CALCULADO + RETIDO + LIBERADO para dois titulares distintos
- Cobrir os 7 cenarios descritos na techspec (secao "Testes de Integracao")
- Verificar contagens de linhas nas secoes e calculos de `totalAReceber`
- Verificar case-insensitivity do filtro `titularNome`

## Subtarefas

- [ ] 9.1 Criar `DemonstrativoControllerIntegrationTest.java` em `distribuicao-tests/src/test/java/.../integration/`
- [ ] 9.2 Implementar setup: inserir `ProcessoDistribuicao` com status FINALIZADO via repositorio ou SQL direto
- [ ] 9.3 Inserir creditos CALCULADO (2 para titular T1, 1 para titular T2), RETIDO (1 para T1) e LIBERADO (1 para T1, com `processoLiberacaoId = processoId`)
- [ ] 9.4 Teste: `GET /processos/{id}/demonstrativos` → 200 com 2 titulares, totais corretos
- [ ] 9.5 Teste: `GET /processos/{id}/demonstrativos/{titularId}` → 200 com secoes 1/2/3 com contagens corretas
- [ ] 9.6 Teste: titular inexistente → 404
- [ ] 9.7 Teste: filtro `?titularNome=silva` case-insensitive (T1 = "Joao Silva", T2 = "Ana Costa") → 1 resultado
- [ ] 9.8 Teste: `totalAReceber = totalCalculado + totalLiberado` (sem RETIDO)
- [ ] 9.9 Teste: `ajustesEstorno = []` e `totalAjustesEstorno = "0.00"`

## Sequenciamento

- Bloqueado por: 5.0 (controller + authz), 8.0 (boas praticas: unitarios antes de IT)
- Desbloqueia: nenhuma (ultima tarefa tecnica da feature)
- Paralelizavel: Nao

## Detalhes de Implementacao

### Localizacao do arquivo

```
distribuicao-tests/src/test/java/br/com/ecad/distribuicao/
  integration/DemonstrativoControllerIntegrationTest.java   ← novo
```

### Padrao de IT existente no projeto

Verificar um IT existente (ex: testes de ProcessoController) para identificar:
- Como o contexto Spring e configurado (`@SpringBootTest` ou `@WebMvcTest`)
- Como o Testcontainers e inicializado
- Como auth e tratada nos ITs (bearer token fixo, `AUTH_ENABLED=false` ou mock)
- Se ha um `TestDataBuilder` ou factory de entidades

### Esqueleto do teste

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
// adicionar anotacoes Testcontainers conforme padrao do projeto
class DemonstrativoControllerIntegrationTest {

    // UUID fixos para dados de teste
    static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID TITULAR_T1   = UUID.fromString("00000000-0000-0000-0000-000000000010");
    static final UUID TITULAR_T2   = UUID.fromString("00000000-0000-0000-0000-000000000020");

    @BeforeEach
    void setup() {
        // inserir processo FINALIZADO
        // inserir 2 creditos CALCULADO para T1 (ex: valorCredito 300.00 e 300.00)
        // inserir 1 credito RETIDO para T1 (ex: valorCredito 100.00)
        // inserir 1 credito LIBERADO para T1 com processoLiberacaoId = PROCESSO_ID (ex: 200.00)
        // inserir 1 credito CALCULADO para T2 (ex: 500.00)
        // titularNome T1 = "Joao Silva", T2 = "Ana Costa"
    }

    @Test
    void deveListarDoisTitularesComTotaisCorretos() {
        // GET /processos/{PROCESSO_ID}/demonstrativos
        // Expect: 2 items
        // T1: totalCalculado="600.00", totalRetido="100.00", totalLiberado="200.00", totalAReceber="800.00"
        // T2: totalCalculado="500.00", totalRetido="0.00", totalLiberado="0.00", totalAReceber="500.00"
    }

    @Test
    void deveRetornarSecoesCorrietaParaTitularT1() {
        // GET /processos/{PROCESSO_ID}/demonstrativos/{TITULAR_T1}
        // Expect: creditosPeriodo.size()==2, creditosRetidos.size()==1, creditosLiberados.size()==1
        // Expect: resumo.totalAReceber=="800.00"
        // Expect: ajustesEstorno==[], totalAjustesEstorno=="0.00"
    }

    @Test
    void deveRetornar404ParaTitularInexistente() {
        UUID titularNaoExistente = UUID.randomUUID();
        // GET /processos/{PROCESSO_ID}/demonstrativos/{titularNaoExistente}
        // Expect: 404
    }

    @Test
    void deveFiltrarPorNomeCaseInsensitive() {
        // GET /processos/{PROCESSO_ID}/demonstrativos?titularNome=silva
        // Expect: 1 item (apenas "Joao Silva")
    }

    @Test
    void deveTotalAReceberSemRetido() {
        // Verificar explicitamente que totalAReceber = CALCULADO + LIBERADO (sem RETIDO)
        // Mesmos dados do setup — redundante mas explicito para rastreabilidade do RF-11
    }

    @Test
    void deveAjustesEstornoSempreVazios() {
        // GET /processos/{PROCESSO_ID}/demonstrativos/{TITULAR_T1}
        // Expect: ajustesEstorno == [] e totalAjustesEstorno == "0.00"
    }
}
```

### Sobre autenticacao nos ITs

Verificar o padrao do projeto. Se `AUTH_ENABLED=false` for a abordagem nos ITs, configurar via `@TestPropertySource(properties = "AUTH_ENABLED=false")`. Se usar token mockado, seguir o padrao de `AuthzPermissionEnforcementTest` (ja existe no modulo).

### Fallback para ambientes sem Docker

Se o CI nao tiver Docker engine >= 1.44:

```java
@DisabledIfSystemProperty(named = "skipDockerTests", matches = "true")
class DemonstrativoControllerIntegrationTest { ... }
```

Adicionar instrucao no README do modulo de testes ou no comentario da classe.

## Criterios de Sucesso

- Todos os 6+ testes passam com Testcontainers rodando localmente
- `mvn -pl distribuicao-tests test -Dtest="DemonstrativoControllerIntegrationTest"` → BUILD SUCCESS
- Nenhum hardcode de porta ou hostname (Testcontainers gerencia isso)
- `totalAReceber` verificado com valor exato de string (`"800.00"`, nao comparacao numerica aproximada)
