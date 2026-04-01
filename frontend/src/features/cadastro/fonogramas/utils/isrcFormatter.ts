export function formatIsrc(isrc: string): string {
  if (!isrc) return '';
  const clean = isrc.replace(/-/g, '').toUpperCase();
  if (clean.length !== 12) return clean;
  return `${clean.substring(0, 2)}-${clean.substring(2, 5)}-${clean.substring(5, 7)}-${clean.substring(7, 12)}`;
}
