import type { FastifyBaseLogger } from 'fastify';
import { redactSensitiveData } from '../security/redaction.js';

export function logSanitizedInfo(
  logger: FastifyBaseLogger,
  payload: Record<string, unknown>,
  message: string,
): void {
  logger.info(redactSensitiveData(payload), message);
}

export function logSanitizedError(
  logger: FastifyBaseLogger,
  payload: Record<string, unknown>,
  message: string,
): void {
  logger.error(redactSensitiveData(payload), message);
}
