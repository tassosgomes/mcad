import type { ReactNode } from 'react';
import styles from './Table.module.css';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
}

export function Table<T>({ columns, data, keyExtractor }: TableProps<T>) {
  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key as string} className={styles.th}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                Nenhum registro encontrado.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className={styles.tr}>
                {columns.map((col) => (
                  <td key={col.key as string} className={styles.td}>
                    {col.render 
                      ? col.render((item as any)[col.key], item)
                      : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
