import { onlyAlphanumeric } from './formatters';

export function isValidCnpj(cnpj: string): boolean {
  const clean = onlyAlphanumeric(cnpj);
  if (clean.length !== 14) return false;
  if (!/^\d$/.test(clean[12]) || !/^\d$/.test(clean[13])) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcDigit(input: string, weights: number[]): number {
    const sum = weights.reduce((acc, weight, index) => {
      return acc + (input.charCodeAt(index) - 48) * weight;
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  const base = clean.slice(0, 12);
  const dv1 = calcDigit(base, weights1);
  const dv2 = calcDigit(`${base}${dv1}`, weights2);
  return clean[12] === String(dv1) && clean[13] === String(dv2);
}
