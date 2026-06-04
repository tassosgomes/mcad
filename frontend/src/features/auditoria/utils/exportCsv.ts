function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const headerLine = columns.map((col) => escapeCsvCell(col.header)).join(';');
  const bodyLines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(col.accessor(row))).join(';'),
  );
  // BOM para Excel reconhecer UTF-8
  const content = `﻿${[headerLine, ...bodyLines].join('\n')}`;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
