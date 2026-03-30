/**
 * Validates a Brazilian CNPJ number, supporting both the legacy numeric format
 * and the new alphanumeric format introduced by the RFB (Receita Federal do Brasil).
 *
 * Algorithm: Módulo 11 with ASCII-48 conversion (as spec'd in docs/validacoes/cnpj.md).
 * - Weights for DV1: [5,4,3,2,9,8,7,6,5,4,3,2]
 * - Weights for DV2: [6,5,4,3,2,9,8,7,6,5,4,3,2]
 * - Check digits (positions 13-14) must always be numeric
 */
export function isValidCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length !== 14) return false;

  // DVs must be numeric
  if (!/^\d$/.test(clean[12]) || !/^\d$/.test(clean[13])) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcDigit(input: string, weights: number[]): number {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      const val = input.charCodeAt(i) - 48; // ASCII - 48
      sum += val * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const base = clean.substring(0, 12);
  const dv1 = calcDigit(base, weights1);
  const dv2 = calcDigit(base + dv1, weights2);

  return clean[12] === String(dv1) && clean[13] === String(dv2);
}
