import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLogtoSignature(rawBody: Buffer, signature: string | undefined, signingKey: string): boolean {
  if (!signature) {
    return false;
  }

  const expected = createHmac('sha256', signingKey).update(rawBody).digest('hex');
  const received = signature.trim();

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
