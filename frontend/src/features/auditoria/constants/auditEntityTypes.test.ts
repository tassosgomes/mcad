import { describe, expect, it } from 'vitest';
import { auditEntityTypes } from './auditEntityTypes';

describe('auditEntityTypes', () => {
  it('uses cadastro backend entity names for obra ownership records', () => {
    expect(auditEntityTypes.titularidade).toBe('TitularidadeAutoral');
    expect(auditEntityTypes.participacao).toBe('ParticipacaoConexa');
  });
});
