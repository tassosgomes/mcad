/**
 * Formats a raw CPF string (11 digits) to the display format: 000.000.000-00
 */
export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Formats a raw CNPJ string (14 alphanumeric chars) to the display format:
 * - Numeric: 00.000.000/0001-00
 * - Alphanumeric: A1.B2C.3D4/1A2B-99
 */
export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/**
 * Format a raw document string based on tipo (PF uses CPF, PJ uses CNPJ).
 */
export function formatDocumento(documento: string, tipo: 'PF' | 'PJ'): string {
  return tipo === 'PF' ? formatCpf(documento) : formatCnpj(documento);
}

/**
 * Formats CAE / IPI Name Number: 9 digits → 000.000.000
 */
export function formatCaeIpi(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
}

/**
 * Formats IP Base Number: I-000000000-0
 * Always starts with 'I', then 9 digits, then 1 check digit.
 */
export function formatIpBase(value: string): string {
  // Strip everything except digits (the 'I' prefix is fixed)
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 9) return `I-${digits}`;
  return `I-${digits.slice(0, 9)}-${digits.slice(9)}`;
}

/**
 * Returns the raw digits from a CAE/IPI formatted string.
 */
export function stripCaeIpi(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Returns the raw digits from an IP Base formatted string.
 */
export function stripIpBase(value: string): string {
  return value.replace(/\D/g, '');
}
