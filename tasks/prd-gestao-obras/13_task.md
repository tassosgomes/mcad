---
status: pending
parallelizable: true
blocked_by: ["11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 13.0: Feature — Componentes Especiais (IswcSection, DepuracaoBanner, DepuracaoModal, DPToggle)

## Visão Geral

Criar os 4 componentes diferenciadores de F03: IswcSection (botão com 3 estados + loading + tooltip), DepuracaoBanner (banner imutável + link), DepuracaoModal (confirmação antes de depurar), DominioPublicoToggle (toggle flag).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/obras/components/IswcSection.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/DepuracaoBanner.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/DepuracaoModal.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/DominioPublicoToggle.tsx` + `.module.css`
- **Referência:**
  - `frontend/DESIGN.md`
  - `tasks/prd-gestao-obras/techspec-frontend.md` (seções "Componentes Chave")
  - Stitch screens (task 10.0)
- **Skills:** `react-architecture`, `frontend-design`

## Subtarefas

- [ ] 13.1 **IswcSection** — exibe ISWC read-only (mono) + botão "Obter ISWC". 3 estados: habilitado (status PENDENTE + tem titulares), loading (spinner), desabilitado (já tem ISWC ou sem titulares ou status != PENDENTE). Tooltip quando desabilitado. Usa useObterIswc + showToast.
- [ ] 13.2 **DepuracaoBanner** — background `--color-secondary-container`, ícone AlertCircle, texto "Esta obra foi depurada", Link para `/cadastro/obras/{obraDepuradaParaId}` ("Ver nova versão →").
- [ ] 13.3 **DepuracaoModal** — usa Modal genérico. Texto: "Esta alteração irá depurar a obra atual e criar uma nova obra. A obra original ficará imutável com status DEPURADA. Deseja continuar?". Botões: Cancelar (secondary) | Confirmar Depuração (danger). Usa useDepurarObra. Sucesso → navigate para nova obra + toast.
- [ ] 13.4 **DominioPublicoToggle** — checkbox/toggle "Domínio Público". Visível apenas em PENDENTE e LIBERADO. Usa useDominioPublico. Toast de confirmação.
- [ ] 13.5 Verificar: `npm run build`

## Detalhes de Implementação

### IswcSection — lógica de estados
```typescript
const isDisabled = obra.status !== 'PENDENTE' || !temTitulares || obra.iswc !== null;
const buttonLabel = obterIswc.isPending ? <Spinner /> : obra.iswc ? 'ISWC Obtido' : 'Obter ISWC';
const tooltipText = !temTitulares ? 'Adicione titulares autorais' :
                    obra.iswc ? 'ISWC já obtido' :
                    obra.status !== 'PENDENTE' ? 'Disponível apenas para obras pendentes' : '';
```

### DepuracaoModal — fluxo PUT → 409 → modal → POST /depurar
O modal é aberto pela `ObraDetailPage` quando o PUT retorna 409 com `code: "DEPURACAO_NECESSARIA"`. Recebe os dados atualizados como prop e envia via `POST /depurar`.

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] IswcSection mostra 3 estados visuais corretos
- [ ] DepuracaoBanner exibe link funcional para nova obra
- [ ] DepuracaoModal navega para nova obra após sucesso
- [ ] DPToggle alterna e exibe toast
- [ ] Nenhum componente especial visível em obras DEPURADAS (exceto banner)
