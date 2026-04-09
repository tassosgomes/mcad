# Plano de Testes — HU-02: Cadastrar Titular Pessoa Juridica

**Task ID:** qa_task_02
**Data:** 2026-04-08
**Tipos:** API, Banco

---

## Requisitos Cobertos

- RF-01: Criar titular com nome, tipo PJ, CNPJ, nacionalidade, associacao, opcional CAE/IPI
- RF-03: CNPJ obrigatorio para PJ — validacao modulo 11 alfanumerico RFB + retrocompatibilidade numerica
- RF-04: CNPJ como Value Object com validacao embutida
- RF-05: CNPJ unico no sistema — duplicado retorna 409
- RF-06: Associacao obrigatoria
- RF-07: Nacionalidade obrigatoria
- RF-08: Status inicial = ATIVO
- RF-09: CAE/IPI opcional

---

## Casos de Teste

### CT-01: Happy path — CNPJ numerico legado
- **Pre-condicao:** Nao existe titular com CNPJ 11222333000181
- **Passos:** POST /api/v1/titulares com tipo=PJ, documento=11222333000181, nome=Editora Musical QA Ltda, associacaoId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
- **Expected:** 201 Created, status=ATIVO, documentoFormatado=11.222.333/0001-81
- **Tipo:** API

### CT-02: CNPJ alfanumerico RFB valido #1
- **Pre-condicao:** Nao existe titular com CNPJ HM7522MH000102
- **Passos:** POST /api/v1/titulares com tipo=PJ, documento=HM7522MH000102, nome=Produtora Alfa 1 QA
- **Expected:** 201 Created, documentoFormatado=HM.752.2MH/0001-02
- **Tipo:** API

### CT-03: CNPJ alfanumerico RFB valido #2
- **Pre-condicao:** Nao existe titular com CNPJ GW2TW72R000135
- **Passos:** POST /api/v1/titulares com tipo=PJ, documento=GW2TW72R000135, nome=Produtora Alfa 2 QA
- **Expected:** 201 Created, documentoFormatado=GW.2TW.72R/0001-35
- **Tipo:** API

### CT-04: CNPJ alfanumerico RFB valido #3
- **Pre-condicao:** Nao existe titular com CNPJ KY4K2B3A000180
- **Passos:** POST /api/v1/titulares com tipo=PJ, documento=KY4K2B3A000180, nome=Produtora Alfa 3 QA
- **Expected:** 201 Created, documentoFormatado=KY.4K2.B3A/0001-80
- **Tipo:** API

### CT-05: CNPJ invalido — digitos verificadores errados
- **Pre-condicao:** Nenhuma
- **Passos:** POST /api/v1/titulares com tipo=PJ, documento=12345678000199
- **Expected:** 400 ou 422 (CNPJ invalido)
- **Tipo:** API

### CT-06: CNPJ duplicado (unicidade RF-05)
- **Pre-condicao:** CT-01 executado com sucesso (CNPJ 11222333000181 ja cadastrado)
- **Passos:** POST /api/v1/titulares com mesmo CNPJ 11222333000181
- **Expected:** 409 Conflict
- **Tipo:** API

### CT-07: Campo obrigatorio ausente — sem nome
- **Pre-condicao:** Nenhuma
- **Passos:** POST /api/v1/titulares tipo=PJ sem campo nome
- **Expected:** 400 ou 422
- **Tipo:** API

### CT-08: Tipo PJ sem documento
- **Pre-condicao:** Nenhuma
- **Passos:** POST /api/v1/titulares tipo=PJ sem campo documento
- **Expected:** 400 ou 422
- **Tipo:** API

### CT-09: Status default ATIVO para PJ
- **Pre-condicao:** CT-01 executado com sucesso
- **Passos:** Verificar campo status no response do CT-01
- **Expected:** status=ATIVO
- **Tipo:** API (validacao do response de CT-01)

### CT-10: CAE/IPI opcional para PJ
- **Pre-condicao:** Nao existe titular com CNPJ 11444777000161
- **Passos:** POST /api/v1/titulares tipo=PJ com caeIpi=IPI987654, documento=11444777000161
- **Expected:** 201, campo caeIpi presente no response com valor IPI987654
- **Tipo:** API

### CT-11: Validacao cruzada — PJ com CPF (11 digitos)
- **Pre-condicao:** Nenhuma
- **Passos:** POST /api/v1/titulares tipo=PJ com documento=52998224725 (CPF 11 digitos)
- **Expected:** 400 ou 422
- **Tipo:** API

## Cleanup
DELETE de todos os titulares PJ criados nesta task:
- CT-01: CNPJ 11222333000181
- CT-02: CNPJ HM7522MH000102
- CT-03: CNPJ GW2TW72R000135
- CT-04: CNPJ KY4K2B3A000180
- CT-10: CNPJ 11444777000161
