---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>cadastro/repertorios</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Implementar o wizard de repertório e seus testes de componente

## Relacionada às User Stories

- [HU-01] Cadastrar repertório completo (direta)
- [HU-02] Reutilizar titular existente (direta)
- [HU-03] Corrigir erros antes de gravar (direta)
- [HU-04] Consultar o resultado (direta)

## Requisitos

- RF-01–RF-19: etapas, pendências, resumo, resultado e decisão após indisponibilidade ISWC.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/repertorio/components/RepertorioWizard.tsx`
  - `frontend/src/features/cadastro/repertorio/components/TitularRepertorioSelector.tsx`
  - `frontend/src/features/cadastro/repertorio/components/FonogramasRepertorioStep.tsx`
  - `frontend/src/features/cadastro/repertorio/components/RevisaoRepertorioStep.tsx`
  - `frontend/src/features/cadastro/repertorio/__tests__/CadastroRepertorioPage.test.tsx`
- **Modificar:**
  - `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.tsx`
  - `frontend/src/features/cadastro/repertorio/pages/CadastroRepertorioPage.module.css`
- **Referência:**
  - `frontend/src/features/cadastro/repertorio/types/repertorio.ts`
  - `frontend/src/features/cadastro/repertorio/hooks/useCadastroRepertorio.ts`
- **Skills:** react-architecture, react-code-quality, react-testing, react-observability, react-production-readiness.

## Subtarefas

- [ ] 6.1 Implementar reducer local e indicador das quatro etapas: Obra; titulares/titularidades; Fonogramas/participações; revisão.
- [ ] 6.2 Permitir avançar/voltar sem mutação remota e evidenciar pendências por etapa antes da revisão.
- [ ] 6.3 Buscar Titular por CPF/CNPJ, exibir resumo suficiente para seleção e só oferecer cadastro novo quando não houver resultado.
- [ ] 6.4 Coletar múltiplos Fonogramas, URL de áudio e participações; exibir percentuais calculados/previsíveis e pendências de intérprete/produtor.
- [ ] 6.5 Construir revisão navegável com totais autorais, Fonogramas, participações e confirmação.
- [ ] 6.6 Em sucesso, mostrar códigos, ISWC e links de detalhe; em `ISWC_INDISPONIVEL`, mostrar somente Tentar novamente ou Salvar como pendente e manter o estado em memória.
- [ ] 6.7 Escrever testes RTL/Vitest com MSW: avanço/retorno, pendências, retry, salvar pendente e sucesso.

## Sequenciamento

- Bloqueado por: 5.0.
- Desbloqueia: 7.0.
- Paralelizável: Não — compõe os contratos e hook da base frontend.

## Rastreabilidade

- Esta tarefa cobre: RF-01–RF-19 (interface); a API continua sendo a autoridade final das regras.
- Evidência esperada: testes RTL para fluxo, validação, retry e salvamento pendente.

## Detalhes de Implementação

Não alterar as páginas individuais de Titulares, Obras ou Fonogramas além do ponto de entrada previsto. Componentes devem ter responsabilidade única; extraia subcomponentes se passarem de ~300 linhas. A UI pode calcular projeções para apresentação, mas a validação final e os percentuais oficiais pertencem ao backend. Sempre use `getByRole`, `getByLabelText` e `userEvent` nos testes; não testar detalhes internos do reducer.

**Convenções da stack:** TypeScript strict, sem `any`; componentes/hook pequenos e tipados; efeitos com cleanup quando necessário; queries de API mockadas por MSW; não rastrear documentos ou conteúdo do formulário.

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run test -- src/features/cadastro/repertorio/__tests__/CadastroRepertorioPage.test.tsx` passa em `frontend/`.
- [ ] `npm run build` em `frontend/` passa.
- [ ] Não é possível confirmar sem Obra, 100% autoral, um Fonograma, URL de áudio, Intérprete e Produtor.
- [ ] Após `502/ISWC_INDISPONIVEL`, retry não envia POST pendente; salvar pendente envia somente o endpoint pendente.
- [ ] Links do sucesso levam às rotas de detalhe existentes e o estado pendente evidencia a ausência de ISWC.
