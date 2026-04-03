---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — PageHeaders + Banners Depuração (código em vez de UUID)

## Visão Geral

Atualizar PageHeaders das telas de detalhe para exibir código (ex: "Titular #67494"). Atualizar banners de depuração para exibir código da nova entidade. Atualizar seção de fonogramas na obra para exibir código.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/titulares/pages/TitularEditPage.tsx` — título: `Titular #${titular.codigo}`
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — título: `Obra #${obra.codigo}`
  - `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` — título: `Fonograma #${fonograma.codigo}`
  - `features/cadastro/obras/components/DepuracaoBanner.tsx` — exibir `#${novaObra.codigo}` (precisa do codigo da nova obra no response de depuração)
  - `features/cadastro/fonogramas/components/FonogramaDepuracaoBanner.tsx` — exibir `#${novoFonograma.codigo}`
  - `features/cadastro/fonogramas/components/ObraFonogramasSection.tsx` — +codigo na tabela

## Subtarefas

- [ ] 6.1 TitularEditPage: `<PageHeader title={`Titular #${titular.codigo}`} />`
- [ ] 6.2 ObraDetailPage: `<PageHeader title={`Obra #${obra.codigo}`} />`
- [ ] 6.3 FonogramaDetailPage: `<PageHeader title={`Fonograma #${fonograma.codigo}`} />`
- [ ] 6.4 DepuracaoBanner: "Nova versão: #{codigo} →" (extrair codigo do response de depuração que retorna entidade completa)
- [ ] 6.5 FonogramaDepuracaoBanner: idem
- [ ] 6.6 ObraFonogramasSection: +codigo na tabela simples
- [ ] 6.7 Verificar que UUID não aparece em nenhum lugar da interface
- [ ] 6.8 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] PageHeaders exibem "Entidade #N" (não UUID)
- [ ] Banners de depuração exibem código da nova entidade
- [ ] UUID oculto em toda a interface
- [ ] `npm run build` compila sem erros
