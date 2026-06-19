import { Md5 } from 'ts-md5';

const UUID_N = /^[0-9a-f]{32}$/i;
const UUID_D = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i;

function tryParseGuid(subject: string): string | null {
  const d = subject.match(UUID_D);
  if (d) return [d[1], d[2], d[3], d[4], d[5]].join('-').toLowerCase();
  if (UUID_N.test(subject)) {
    return [
      subject.slice(0, 8),
      subject.slice(8, 12),
      subject.slice(12, 16),
      subject.slice(16, 20),
      subject.slice(20, 32),
    ].join('-').toLowerCase();
  }
  return null;
}

function md5HexToDotNetGuid(md5hex: string): string {
  const h = md5hex.toLowerCase();
  return [
    h.slice(6, 8) + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2),
    h.slice(10, 12) + h.slice(8, 10),
    h.slice(14, 16) + h.slice(12, 14),
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

export function analistaIdFromSubject(subject: string): string {
  const guid = tryParseGuid(subject);
  if (guid !== null) return guid;
  return md5HexToDotNetGuid(Md5.hashStr(subject));
}
