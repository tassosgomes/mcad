import type { FastifyReply } from 'fastify';

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message?: string,
): void {
  reply.code(status).send({ code, ...(message ? { message } : {}) });
}
