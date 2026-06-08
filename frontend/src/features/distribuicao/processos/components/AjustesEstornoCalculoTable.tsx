import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import type { BadgeVariant } from '@components/ui/badge';
import { formatCurrency, formatDateTime } from '../utils/calculoFormatters';
import type { AjusteEstornoCalculoItem, AjusteEstornoCalculoLinha } from '../types/calculo';
import styles from './AjustesEstornoCalculoTable.module.css';

interface AjustesEstornoCalculoTableProps {
  items: AjusteEstornoCalculoItem[];
}

function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDENTE_APLICACAO: 'accent',
  PREVISTO: 'warning',
  APLICADO: 'success',
  CANCELADO: 'muted',
  IGNORADO_SEM_DISTRIBUICAO: 'muted',
  PROCESSO_CRIADO_DESATUALIZADO: 'warning',
  ERRO_INTEGRIDADE: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_APLICACAO: 'Pendente',
  PREVISTO: 'Previsto',
  APLICADO: 'Aplicado',
  CANCELADO: 'Cancelado',
  IGNORADO_SEM_DISTRIBUICAO: 'Ignorado',
  PROCESSO_CRIADO_DESATUALIZADO: 'Desatualizado',
  ERRO_INTEGRIDADE: 'Erro',
};

function LinhasExpandidas({ linhas }: { linhas: AjusteEstornoCalculoLinha[] }) {
  if (linhas.length === 0) {
    return <p className={styles.emptyLinhas}>Sem linhas de detalhe.</p>;
  }
  return (
    <table className={styles.linhasTable} aria-label="Linhas do ajuste">
      <thead>
        <tr>
          <th>Titular</th>
          <th>Obra</th>
          <th>Categoria</th>
          <th>Valor crédito origem</th>
          <th>Valor ajuste</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.id}>
            <td>
              <strong>{linha.titularNome}</strong>
              <span>{shortId(linha.titularId)}</span>
            </td>
            <td>
              <strong>{linha.obraTitulo}</strong>
              <span>{shortId(linha.obraId)}</span>
            </td>
            <td>
              {linha.categoria}
              {linha.subcategoriaConexa && (
                <span>{linha.subcategoriaConexa}</span>
              )}
            </td>
            <td className={styles.mono}>{formatCurrency(linha.valorCreditoOrigem)}</td>
            <td className={styles.negativeValue}>{formatCurrency(linha.valorAjuste)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AjusteRow({ item }: { item: AjusteEstornoCalculoItem }) {
  const [expanded, setExpanded] = useState(false);
  const variant: BadgeVariant = STATUS_VARIANT[item.status] ?? 'muted';
  const label = STATUS_LABEL[item.status] ?? item.status;

  return (
    <>
      <tr className={styles.row}>
        <td>
          <button
            type="button"
            className={styles.expandBtn}
            aria-label={expanded ? 'Recolher linhas' : 'Expandir linhas'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className={styles.mono}>{shortId(item.pagamentoId)}</span>
          </button>
        </td>
        <td className={styles.mono}>{item.periodoOrigem}</td>
        <td className={styles.justificativa} title={item.justificativa}>{item.justificativa}</td>
        <td className={styles.negativeValue}>{formatCurrency(item.valorEstornadoBruto)}</td>
        <td className={styles.negativeValue}>{formatCurrency(item.valorAjusteLiquido)}</td>
        <td className={styles.mono}>
          {formatCurrency(item.valorAplicado)}
        </td>
        <td><Badge variant={variant}>{label}</Badge></td>
      </tr>
      {expanded && (
        <tr className={styles.expandedRow}>
          <td colSpan={7} className={styles.expandedCell}>
            <LinhasExpandidas linhas={item.linhas} />
          </td>
        </tr>
      )}
    </>
  );
}

export function AjustesEstornoCalculoTable({ items }: AjustesEstornoCalculoTableProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label="Ajustes por estorno do processo">
          <thead>
            <tr>
              <th>Pagamento</th>
              <th>Período origem</th>
              <th>Justificativa</th>
              <th>Valor bruto</th>
              <th>Valor líquido</th>
              <th>Valor aplicado</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={7}>
                  Nenhum ajuste por estorno associado a este processo.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <AjusteRow key={item.ajusteId} item={item} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Re-export formatDateTime so it can be used in the page if needed
export { formatDateTime };
