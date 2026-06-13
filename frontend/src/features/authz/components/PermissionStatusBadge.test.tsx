import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionStatusBadge } from './PermissionStatusBadge';

describe('PermissionStatusBadge', () => {
  it.each([
    ['ACTIVE', 'Ativa'],
    ['DEPRECATED', 'Depreciada'],
    ['DISABLED', 'Removida'],
  ] as const)('renders the business label for %s', (status, label) => {
    render(<PermissionStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
