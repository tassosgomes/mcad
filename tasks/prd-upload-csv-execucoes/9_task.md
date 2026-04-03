---
status: pending
parallelizable: false
blocked_by: [7.0, 8.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 9.0: Frontend — Componentes

## Visão Geral

Implementar 4 componentes: UploadsSection (wrapper), UploadsTable (com badges de status e spinner), UploadCsvButton (input file multipart) e ErrosUploadPanel (relatório expandível paginado).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/components/UploadsSection.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/UploadsTable.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/UploadCsvButton.tsx` + `.module.css`
  - `frontend/src/features/identificacao/captacoes/components/ErrosUploadPanel.tsx` + `.module.css`
- **Referência:**
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.tsx` (padrão seção)
  - `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.tsx` (padrão tabela)
  - `frontend/src/shared/components/ui/badge/Badge.tsx`
  - `frontend/src/shared/components/ui/pagination/Pagination.tsx`

## Subtarefas

- [ ] 9.1 Criar `UploadCsvButton` + CSS — `<input type="file" accept=".csv">` hidden, trigger via botão, disabled durante upload, validação client-side (extensão .csv, arquivo não vazio)
- [ ] 9.2 Criar `UploadsTable` + CSS — colunas: arquivo, status (badge com spinner para PROCESSANDO), linhas, criadas, erros (link clicável se > 0), data. Linha clicável se COM_ERROS
- [ ] 9.3 Criar `ErrosUploadPanel` + CSS — painel collapsible com tabela: Linha | Coluna | Erro. Paginação (size=50). Header com nome do arquivo e total de erros
- [ ] 9.4 Criar `UploadsSection` + CSS — orquestra UploadsTable + UploadCsvButton + ErrosUploadPanel. Gerencia estado de upload ativo (polling via useUpload), painel de erros expandido

## Sequenciamento

- Bloqueado por: 7.0 (mockups), 8.0 (hooks)
- Desbloqueia: 10.0
- Paralelizável: Não

## Detalhes de Implementação

**UploadsTable — badges de status:**
```typescript
const statusBadge: Record<StatusUpload, { variant: BadgeVariant; label: string }> = {
  PROCESSANDO: { variant: 'accent', label: '⏳ Processando' },
  CONCLUIDO: { variant: 'success', label: '✅ Concluído' },
  CONCLUIDO_COM_ERROS: { variant: 'warning', label: '⚠️ Com Erros' },
  ERRO: { variant: 'error', label: '❌ Erro' },
};
```

Para PROCESSANDO: adicionar spinner CSS ao lado do badge (animação rotate).

**UploadCsvButton — input file:**
```tsx
<>
  <input
    ref={inputRef}
    type="file"
    accept=".csv"
    style={{ display: 'none' }}
    onChange={handleFileChange}
  />
  <Button
    onClick={() => inputRef.current?.click()}
    disabled={disabled || uploadMutation.isPending}
  >
    {uploadMutation.isPending ? 'Enviando...' : 'Importar CSV'}
  </Button>
</>
```

**ErrosUploadPanel — painel:**
```tsx
{isOpen && (
  <div className={styles.panel}>
    <div className={styles.panelHeader}>
      <span>Erros do upload <strong>{nomeArquivo}</strong> — {totalErros} erros</span>
      <button onClick={onClose}>✕</button>
    </div>
    <table>
      <thead><tr><th>Linha</th><th>Coluna</th><th>Erro</th></tr></thead>
      <tbody>
        {erros?.data.map((e, i) => (
          <tr key={i}><td>{e.linha}</td><td>{e.coluna}</td><td>{e.mensagem}</td></tr>
        ))}
      </tbody>
    </table>
    <Pagination pagination={erros?.pagination} onPageChange={setPage} />
  </div>
)}
```

**UploadsSection — estado:**
```typescript
const [uploadAtivo, setUploadAtivo] = useState<string | null>(null); // ID para polling
const [errosExpandido, setErrosExpandido] = useState<string | null>(null); // ID do upload com erros abertos
const [page, setPage] = useState(1);
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] Input file aceita apenas .csv
- [ ] Badge PROCESSANDO com spinner visual
- [ ] Erros clicáveis expandem painel
- [ ] Painel de erros paginado (size=50)
