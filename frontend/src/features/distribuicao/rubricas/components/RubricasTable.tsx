import { Badge } from '@components/ui/badge';
import { Table } from '@components/ui/table';
import { RowAuditHistoryButton } from '@features/auditoria/components/RowAuditHistoryButton';
import { auditEntityTypes } from '@features/auditoria/constants/auditEntityTypes';
import type { Rubrica } from '../types/rubrica';
import styles from './RubricasTable.module.css';

const columns = [
  {
    key: 'sigla',
    header: 'Sigla',
    render: (value: string) => <span className={styles.sigla}>{value}</span>,
  },
  { key: 'nome', header: 'Nome' },
  {
    key: 'exigeClassificacao',
    header: 'Exige Classificação',
    render: (value: boolean) => (
      <Badge variant={value ? 'accent' : 'muted'}>{value ? 'Sim' : 'Não'}</Badge>
    ),
  },
  {
    key: 'historico',
    header: 'Histórico',
    render: (_value: unknown, item: Rubrica) => (
      <RowAuditHistoryButton
        entityType={auditEntityTypes.rubrica}
        entityId={item.id}
        entityLabel={item.sigla}
      />
    ),
  },
];

export function RubricasTable({ data }: { data: Rubrica[] }) {
  return <Table columns={columns} data={data} keyExtractor={(rubrica) => rubrica.id} />;
}
