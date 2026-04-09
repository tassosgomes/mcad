# Plano de Testes — HU-04: Editar Titular

**Task ID:** qa_task_04
**Tipos:** API

---

## Casos de Teste

### CT-01: Editar nome com sucesso
- **Pre-condicao:** Titular PF criado no setup
- **Passos:** PUT /titulares/{id} com body {"nome": "Nome Editado Teste QA", ...campos obrigatorios}
- **Expected:** HTTP 200, campo nome = "Nome Editado Teste QA" no response
- **Tipo:** API

### CT-02: Editar nacionalidade
- **Pre-condicao:** Titular PF de teste existente
- **Passos:** PUT /titulares/{id} com nacionalidade="Portuguesa"
- **Expected:** HTTP 200, campo nacionalidade = "Portuguesa" no response
- **Tipo:** API

### CT-03: Trocar associacao
- **Pre-condicao:** Titular PF de teste existente, duas associacoes distintas disponíveis
- **Passos:** PUT /titulares/{id} com associacaoId diferente da atual
- **Expected:** HTTP 200, campo associacao.id no response reflete a nova associacao
- **Tipo:** API

### CT-04: Alterar status para FALECIDO
- **Pre-condicao:** Titular PF de teste existente, status atual ATIVO
- **Passos:** PUT /titulares/{id} com status="FALECIDO"
- **Expected:** HTTP 200, campo status = "FALECIDO" no response
- **Tipo:** API

### CT-05: Alterar status para TRANSFERINDO
- **Pre-condicao:** Titular PF de teste existente
- **Passos:** PUT /titulares/{id} com status="TRANSFERINDO"
- **Expected:** HTTP 200, campo status = "TRANSFERINDO" no response
- **Tipo:** API

### CT-06: Retornar para ATIVO
- **Pre-condicao:** Titular PF de teste existente, status atual TRANSFERINDO
- **Passos:** PUT /titulares/{id} com status="ATIVO"
- **Expected:** HTTP 200, campo status = "ATIVO" no response
- **Tipo:** API

### CT-07: Editar CAE/IPI
- **Pre-condicao:** Titular PF de teste existente
- **Passos:** PUT /titulares/{id} com caeIpi="NEWIPI123"
- **Expected:** HTTP 200, campo caeIpi = "NEWIPI123" no response
- **Tipo:** API

### CT-08: Imutabilidade — tipo e documento nao aceitos (RF-11)
- **Pre-condicao:** Titular PF de teste existente, tipo=PF, documento=CPF conhecido
- **Passos:** PUT /titulares/{id} incluindo campos "tipo"="PJ" e "documento"="99999999999999" no body
- **Expected:** API retorna 200 (ignora campos extras) OU retorna erro. Apos a requisicao, GET /titulares/{id} deve confirmar que tipo e documento NAO mudaram
- **Tipo:** API

### CT-09: Editar titular inexistente
- **Pre-condicao:** Nenhuma (UUID zerado nao existe)
- **Passos:** PUT /titulares/00000000-0000-0000-0000-000000000000 com body valido
- **Expected:** HTTP 404
- **Tipo:** API

### CT-10: Validacao — nome vazio
- **Pre-condicao:** Titular PF de teste existente
- **Passos:** PUT /titulares/{id} com nome=""
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

### CT-11: Status invalido
- **Pre-condicao:** Titular PF de teste existente
- **Passos:** PUT /titulares/{id} com status="INVALIDO"
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

---

## Setup necessario
1. Obter token Bearer para analista.teste
2. GET /associacoes — obter IDs de pelo menos 2 associacoes
3. POST /titulares — criar titular PF de teste com CPF valido (modulo 11)

## Cleanup
- DELETE /titulares/{id} — remover o titular criado no setup
