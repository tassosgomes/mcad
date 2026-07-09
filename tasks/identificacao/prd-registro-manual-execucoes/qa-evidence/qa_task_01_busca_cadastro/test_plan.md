# Test Plan — RF-01: Buscar obra/fonograma no Cadastro

**Task ID:** qa_task_01_busca_cadastro
**Data/Hora:** 2026-06-19T00:00:00Z
**Tester:** QA Task Runner (Playwright + cURL)

## API Test Cases

| ID | Descrição | Método | Endpoint | Params | Expected Status | Expected Behavior |
|----|-----------|--------|----------|--------|-----------------|-------------------|
| CT-API-01 | Busca por ISRC válido | GET | /busca | `q=BRUM71500001&tipo=todos&size=20` | 200 | Resultados com tipo=fonograma, ISRC=BRUM71500001 |
| CT-API-02 | Busca por ISWC válido | GET | /busca | `q=T-345.246.800-1&tipo=todos&size=20` | 200 | Resultados com tipo=obra, ISWC=T-345.246.800-1 |
| CT-API-03 | Busca por título parcial (min 3 chars) | GET | /busca | `q=Djavan&tipo=todos&size=20` | 200 | Resultados filtrando por título com "Djavan" |
| CT-API-04 | Busca por nome de titular | GET | /busca | `q=Cabral&tipo=todos&size=20` | 200 | Resultados com titular contendo "Cabral" |
| CT-API-05 | Busca sem resultados (termo inexistente) | GET | /busca | `q=zzzzzzzzzzzzzz&tipo=todos&size=20` | 200 | `resultados` array vazio |
| CT-API-06 | Busca sem autenticação | GET | /busca | `q=teste&tipo=todos&size=20` | 401 ou 403 | Rejeitado por falta de token |

## UI Test Cases

| ID | Descrição | Ação | Expected |
|----|-----------|------|----------|
| CT-UI-01 | Autocomplete com ISRC válido | Digitar "BRUM71500001" no campo de busca do modal de execução | Dropdown mostra fonograma correspondente com ISRC e intérpretes |
| CT-UI-02 | Autocomplete com ISWC válido | Digitar ISWC válido no campo de busca | Dropdown mostra obra correspondente com ISWC |
| CT-UI-03 | Autocomplete com título parcial | Digitar fragmento de título (min 3 chars) | Dropdown mostra resultados filtrados com status badge |
| CT-UI-04 | Autocomplete sem resultados | Digitar termo que não existe | Footer mostra "Criar obra pendente" e "Criar fonograma pendente" |
| CT-UI-05 | Debounce de 300ms | Digitar rapidamente | Requisição enviada após 300ms de inatividade |
| CT-UI-06 | Mínimo de 3 caracteres | Digitar 2 chars | Nenhuma requisição disparada, dropdown não abre |
