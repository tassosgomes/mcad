import type { FastifyReply } from 'fastify';

const JSON_CONTENT_TYPE_PATTERN = /(^|\/|\+)json($|;)/i;
const RESPONSE_HEADER_BLOCKLIST = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

export function responseHeaders(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries());
}

export function isJsonContentType(contentType: string | null): boolean {
  return Boolean(contentType && JSON_CONTENT_TYPE_PATTERN.test(contentType));
}

export async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<{ buffer: Buffer; exceeded: boolean }> {
  const contentLength = response.headers.get('content-length');

  if (contentLength && Number(contentLength) > maxBytes) {
    return {
      buffer: Buffer.alloc(0),
      exceeded: true,
    };
  }

  const reader = response.body?.getReader();

  if (!reader) {
    return {
      buffer: Buffer.alloc(0),
      exceeded: false,
    };
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      return {
        buffer: Buffer.alloc(0),
        exceeded: true,
      };
    }

    chunks.push(Buffer.from(value));
  }

  return {
    buffer: Buffer.concat(chunks, totalBytes),
    exceeded: false,
  };
}

export async function readResponseBody(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

export function copyUpstreamResponseHeaders(reply: FastifyReply, response: Response): void {
  for (const [name, value] of response.headers.entries()) {
    if (!RESPONSE_HEADER_BLOCKLIST.has(name.toLowerCase())) {
      reply.header(name, value);
    }
  }
}
