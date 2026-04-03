import { Table } from '@components/ui/table';
import type { Associacao } from '../types/associacao';
import styles from './AssociacoesTable.module.css';

const columns = [
  { 
    key: 'codigo', 
    header: 'Código', 
    render: (v: number) => <span className={styles.mono}>#{v}</span> 
  },
  { key: 'sigla', header: 'Sigla' },
  { key: 'nome', header: 'Nome' },
  { 
    key: 'cnpj', 
    header: 'CNPJ', 
    render: (v: string) => <span className={styles.mono}>{v}</span> 
  },
];

export function AssociacoesTable({ data }: { data: Associacao[] }) {
  return <Table columns={columns} data={data} keyExtractor={(a) => a.id} />;
}
