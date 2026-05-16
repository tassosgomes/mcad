---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>distribuicao/api,distribuicao/infra</domain>
<type>configuration</type>
<scope>cross_cutting</scope>
<complexity>medium</complexity>
<dependencies>ecad-authz (external service)</dependencies>
<unblocks>"5.0","6.0"</unblocks>
</task_context>

# Tarefa 1.5: Permissionamento (authz-spring-boot-starter + catálogo + migração legacy)

## Relacionada às User Stories

- HU-02..HU-07 (todas exigem autorização no controller)

## Contexto

Antes desta task, a `distribuicao-api` autoriza usando `@PreAuthorize("hasAnyAuthority('SCOPE_access','SCOPE_write')")` no `RubricaController` da F01 — padrão **legado** removido de `arrecadacao-api` e `identificacao-api` pela migração authz encerrada em 2026-05-15 (`docs/migracao-authz/relatorio-final.md`).

Esta task adota o novo padrão (ADR 0002 — naming 4 segmentos; ADR 0003 — backend autoritativo) integrando o `authz-spring-boot-starter` e publicando o catálogo de permissions da Distribuição. **Inclui a migração do `RubricaController` legacy**, pois ADR 0002 proíbe coexistência de padrões dentro do mesmo serviço.

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml`
  - `docs/authz/catalog/distribuicao.md`
- **Modificar:**
  - `services/distribuicao-api/pom.xml` (parent) — adicionar propriedade `<authz-sdk.version>` (alinhar com a usada em `services/arrecadacao-api/pom.xml`)
  - `services/distribuicao-api/distribuicao-api/pom.xml` — adicionar `<dependency>br.org.ecad.authz:authz-spring-boot-starter</dependency>`
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` — adicionar bloco `ecad.authz` (base-url, catalog.domain=distribuicao, register-on-startup, cache.local.ttl, cache.remote.enabled)
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/RubricaController.java` — substituir `@PreAuthorize("hasAnyAuthority('SCOPE_access','SCOPE_write')")` por `@RequiresPermission("distribuicao:default:rubrica:listar")` (GET listar) e `@RequiresPermission("distribuicao:default:rubrica:visualizar")` (GET por id). Remover import de `org.springframework.security.access.prepost.PreAuthorize`
- **Referência (não modificar):**
  - `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml`
  - `docs/authz/catalog/arrecadacao.md`
  - `docs/adr/0002-permission-naming-convention.md`, `docs/adr/0003-backend-authoritative-authorization.md`

## Subtarefas

- [ ] 1.5.1 Adicionar `<authz-sdk.version>` ao parent pom e `<dependency>authz-spring-boot-starter</dependency>` no `distribuicao-api/pom.xml`. Alinhar a versão com a definida em `arrecadacao-api/pom.xml`
- [ ] 1.5.2 Criar `permissions.yaml` com as 7 keys da F02 (processo:listar/visualizar/criar/calcular/aprovar/finalizar/cancelar) + 2 keys legacy (rubrica:listar/visualizar)
- [ ] 1.5.3 Criar `docs/authz/catalog/distribuicao.md` documentando as keys, descrição, endpoint(s) mapeado(s) e perfil-base sugerido (consultor/analista). Espelhar formato de `arrecadacao.md`
- [ ] 1.5.4 Adicionar bloco `ecad.authz` ao `application.yml`:
  ```yaml
  ecad:
    authz:
      base-url: ${ECAD_AUTHZ_BASE_URL:http://localhost:8081}
      catalog:
        domain: distribuicao
        register-on-startup: ${ECAD_AUTHZ_REGISTER_ON_STARTUP:true}
      cache:
        local:
          ttl-seconds: 60
        remote:
          enabled: ${ECAD_AUTHZ_REMOTE_CACHE:true}
          ttl-seconds: 300
  ```
- [ ] 1.5.5 Migrar `RubricaController`: substituir `@PreAuthorize` por `@RequiresPermission` nos 2 endpoints existentes; remover imports não usados
- [ ] 1.5.6 Verificar que a aplicação sobe (`mvn -pl distribuicao-api spring-boot:run`) e registra o catálogo (log do starter)
- [ ] 1.5.7 Verificar compilação: `cd services/distribuicao-api && mvn compile`

## Sequenciamento

- Bloqueado por: nenhum (cross-cutting independente)
- Desbloqueia: 5.0 (controller usa `@RequiresPermission`), 6.0 (`AuthzPermissionEnforcementTest`)
- Paralelizável: **Sim** — pode rodar em paralelo com 1.0, 1.7, 2.0, 3.0

## Detalhes de Implementação

### permissions.yaml (template)

```yaml
## Catálogo de permissões da distribuicao-api consumido pelo
## authz-spring-boot-starter na inicialização.
permissions:
  # ── Rubrica (F01 — legacy migrado nesta task) ─────────────────────────────
  - key: distribuicao:default:rubrica:listar
    name: Listar rubricas
    description: Lista as rubricas sincronizadas a partir da Arrecadação.
    resource: rubrica
    action: listar
  - key: distribuicao:default:rubrica:visualizar
    name: Visualizar rubrica
    description: Detalhe de uma rubrica específica.
    resource: rubrica
    action: visualizar

  # ── Processo de Distribuição (F02) ─────────────────────────────────────────
  - key: distribuicao:default:processo:listar
    name: Listar processos
    description: Lista paginada de processos de distribuição; também usado pelo endpoint /disponiveis.
    resource: processo
    action: listar
  - key: distribuicao:default:processo:visualizar
    name: Visualizar processo
    description: Detalhes de um processo de distribuição.
    resource: processo
    action: visualizar
  - key: distribuicao:default:processo:criar
    name: Criar processo
    description: Cria um novo processo de distribuição para uma combinação rubrica+período.
    resource: processo
    action: criar
  - key: distribuicao:default:processo:calcular
    name: Calcular processo
    description: Dispara o cálculo de créditos (transição CRIADO → CALCULADO).
    resource: processo
    action: calcular
  - key: distribuicao:default:processo:aprovar
    name: Aprovar processo
    description: Aprova o cálculo (transição CALCULADO → APROVADO).
    resource: processo
    action: aprovar
  - key: distribuicao:default:processo:finalizar
    name: Finalizar processo
    description: Finaliza o processo (APROVADO → FINALIZADO; irreversível).
    resource: processo
    action: finalizar
  - key: distribuicao:default:processo:cancelar
    name: Cancelar processo
    description: Cancela o processo a partir de qualquer estado exceto FINALIZADO; exige justificativa.
    resource: processo
    action: cancelar
```

### RubricaController — migração

```java
// REMOVER:
// import org.springframework.security.access.prepost.PreAuthorize;
// @PreAuthorize("hasAnyAuthority('SCOPE_access','SCOPE_write')")

// ADICIONAR:
import br.org.ecad.authz.sdk.annotation.RequiresPermission;

@GetMapping
@RequiresPermission("distribuicao:default:rubrica:listar")
public ResponseEntity<List<RubricaResponse>> listar() { ... }

@GetMapping("/{sigla}")
@RequiresPermission("distribuicao:default:rubrica:visualizar")
public ResponseEntity<RubricaResponse> buscar(@PathVariable String sigla) { ... }
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] App sobe sem erro e log do `authz-spring-boot-starter` mostra "permission catalog registered" para 9 keys (7 F02 + 2 rubrica)
- [ ] `permissions.yaml` declara exatamente 9 keys conforme tabela acima
- [ ] `docs/authz/catalog/distribuicao.md` existe e lista as 9 keys com endpoint mapping
- [ ] **Nenhum `@PreAuthorize` resta em `services/distribuicao-api/`** — `grep -r "@PreAuthorize" services/distribuicao-api/` retorna vazio
- [ ] `application.yml` contém o bloco `ecad.authz` completo
- [ ] Parent pom + distribuicao-api/pom.xml têm a versão do `authz-sdk` alinhada com `arrecadacao-api`
