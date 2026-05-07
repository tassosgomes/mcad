import { Badge } from '@components/ui/badge';
import { Table } from '@components/ui/table';
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
];

export function RubricasTable({ data }: { data: Rubrica[] }) {
  return <Table columns={columns} data={data} keyExtractor={(rubrica) => rubrica.id} />;
}
