---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>arrecadacao/domain-infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>2.0</unblocks>
</task_context>

# Tarefa 1.0: Backend Arrecadação — Domain e Infra

## Visão Geral

Expandir a entidade `Rubrica` para suportar status ativo/inativo, criar o serviço de geração automática de sigla, e atualizar o repositório para suportar persistência.

## Requisitos

- Migration adicionando `ativo` (boolean, default TRUE) à tabela `arrecadacao.rubricas`
- Entidade `Rubrica` com campo `ativo` e métodos `ativar()` / `inativar()`
- `RubricaRepository` expandido com `save()` e `existsBySigla()`
- Implementação desses métodos em `JpaRubricaRepository`
- `SiglaSuggester` (domain service puro) com algoritmo de geração automática

## Subtarefas

- [ ] 1.1 Criar migration `V{X}__add_ativo_rubrica.sql`
  ```sql
  ALTER TABLE arrecadacao.rubricas 
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
  CREATE INDEX idx_rubricas_ativo ON arrecadacao.rubricas(ativo);
  ```
- [ ] 1.2 Atualizar entidade `Rubrica`
  - Adicionar `private boolean ativo`
  - Adicionar `public void ativar()` e `public void inativar()`
  - Atualizar construtor para receber `ativo` (default true)
- [ ] 1.3 Expandir `RubricaRepository`
  - `Rubrica save(Rubrica rubrica)`
  - `boolean existsBySigla(String sigla)`
- [ ] 1.4 Implementar métodos em `JpaRubricaRepository`
  - `save()` delega para `springDataRubricaRepository.save()`
  - `existsBySigla()` usa `springDataRubricaRepository.existsBySigla()`
- [ ] 1.5 Adicionar `existsBySigla` em `SpringDataRubricaRepository`
- [ ] 1.6 Criar `SiglaSuggester` como domain service
  - Interface + implementação padrão
  - Método `String sugerir(String nome)`
  - Algoritmo conforme PRD §12

## Detalhes de Implementação

### SiglaSuggester — Algoritmo

```java
@Component
public class SiglaSuggesterImpl implements SiglaSuggester {
    private static final Set<String> PREPOSICOES = Set.of(
        "DE", "DA", "DO", "DAS", "DOS", "EM", "NO", "NA", 
        "A", "O", "E", "PARA", "POR", "COM"
    );
    
    @Override
    public String sugerir(String nome) {
        // 1. Uppercase
        String normalizado = nome.toUpperCase();
        // 2. Remover acentos
        normalizado = Normalizer.normalize(normalizado, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        // 3. Remover caracteres especiais exceto letras, dígitos, espaço, hífen
        normalizado = normalizado.replaceAll("[^A-Z0-9\\s\\-]", " ");
        // 4. Tratar parênteses como separadores (já feito no passo 3)
        // 5. Split
        String[] palavras = normalizado.split("[\\s\\-]+");
        // 6. Filtrar preposições
        List<String> significativas = Arrays.stream(palavras)
            .filter(p -> !PREPOSICOES.contains(p))
            .filter(p -> !p.isBlank())
            .collect(Collectors.toList());
        // 7. Fallback se vazio
        if (significativas.isEmpty()) {
            significativas = Arrays.stream(palavras)
                .filter(p -> !p.isBlank())
                .collect(Collectors.toList());
        }
        // 8. Primeiras letras
        String sigla = significativas.stream()
            .map(p -> String.valueOf(p.charAt(0)))
            .collect(Collectors.joining("_"));
        // 9. Fallback < 3 chars
        if (sigla.length() < 3 && !significativas.isEmpty()) {
            sigla = significativas.get(0).substring(0, 
                Math.min(3, significativas.get(0).length()));
        }
        // 10. Truncar > 20
        if (sigla.length() > 20) {
            sigla = sigla.substring(0, 20);
        }
        return sigla;
    }
}
```

## Critérios de Sucesso

- [ ] Migration aplica sem erro em banco existente (testar com `mvn flyway:migrate`)
- [ ] `Rubrica` entity suporta `ativo=true/false`
- [ ] Repository consegue salvar e verificar existência de sigla
- [ ] `SiglaSuggester` gera siglas corretas para casos de teste:
  - "Rádio" → "RADIO"
  - "TV Aberta" → "TV_ABERTA"
  - "Streaming Vídeo (VOD)" → "STREAMING_VIDEO_VOD"
  - "Show ao Vivo" → "SHOW_AO_VIVO"
  - "Web" → "WEB"
