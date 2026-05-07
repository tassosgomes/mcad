---
status: completed
parallelizable: true
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"13.0"</unblocks>
</task_context>

# Tarefa 11.0: Feature — Componentes Depuração (Banner, Modal)

## Visão Geral

Reutilização do padrão de F03 adaptado para fonograma: banner "depurado" + link e modal de confirmação.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/fonogramas/components/FonogramaDepuracaoBanner.tsx` + `.module.css`
  - `features/cadastro/fonogramas/components/FonogramaDepuracaoModal.tsx` + `.module.css`
- **Referência:**
  - `features/cadastro/obras/components/DepuracaoBanner.tsx` (padrão)
  - `features/cadastro/obras/components/DepuracaoModal.tsx` (padrão)

## Subtarefas

- [x] 11.1 **FonogramaDepuracaoBanner** — `--color-secondary-container` bg, ícone AlertCircle, "Este fonograma foi depurado", Link para `/cadastro/fonogramas/{fonogramaDepuradoParaId}`.
- [x] 11.2 **FonogramaDepuracaoModal** — Modal "Alterar o ISRC irá depurar este fonograma. O original ficará imutável e um novo será criado na mesma obra. Deseja continuar?". Botões Cancelar/Confirmar. Usa useDepurarFonograma. Sucesso → navigate novo + toast.
- [x] 11.3 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] Banner exibe link funcional para novo fonograma
- [x] Modal navega para novo fonograma após sucesso
