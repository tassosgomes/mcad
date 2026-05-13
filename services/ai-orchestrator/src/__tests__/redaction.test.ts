import assert from 'node:assert/strict';
import { test } from 'node:test';
import { redactSensitiveData, redactSensitiveText } from '../security/redaction.js';

test('redactSensitiveText masks tokens and personal identifiers', () => {
  const redacted = redactSensitiveText(
    'Bearer abc.def.ghi CPF 123.456.789-10 CNPJ 12.345.678/0001-99 email user@example.com sk-testsecret',
  );

  assert.equal(redacted.includes('abc.def.ghi'), false);
  assert.equal(redacted.includes('123.456.789-10'), false);
  assert.equal(redacted.includes('12.345.678/0001-99'), false);
  assert.equal(redacted.includes('user@example.com'), false);
  assert.equal(redacted.includes('sk-testsecret'), false);
});

test('redactSensitiveData masks sensitive object keys recursively', () => {
  const redacted = redactSensitiveData({
    authorization: 'Bearer token',
    nested: {
      email: 'person@example.com',
      safe: 'value',
    },
  });

  assert.deepEqual(redacted, {
    authorization: '[REDACTED]',
    nested: {
      email: '[EMAIL_REDACTED]',
      safe: 'value',
    },
  });
});
