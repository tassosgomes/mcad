export function isValidIsrc(isrc: string): boolean {
  if (!isrc) return false;
  const cleanIsrc = isrc.replace(/-/g, '').toUpperCase();
  const regex = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
  return regex.test(cleanIsrc);
}
