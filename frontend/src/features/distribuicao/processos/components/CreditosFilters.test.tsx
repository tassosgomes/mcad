import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CategoriaCredito } from '../types/calculo';
import { CreditosFilters } from './CreditosFilters';

interface FiltersValue {
  categoria: CategoriaCredito | '';
  titularId: string;
  obraId: string;
}

function ControlledFilters({ onChange }: { onChange: (value: FiltersValue) => void }) {
  const [value, setValue] = useState<FiltersValue>({
    categoria: '',
    titularId: '',
    obraId: '',
  });

  return (
    <CreditosFilters
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChange(nextValue);
      }}
    />
  );
}

describe('CreditosFilters', () => {
  it('updates category, holder, and work filters', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ControlledFilters onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Categoria'), 'CONEXO');
    await user.type(screen.getByLabelText('Titular'), 'titular-1');
    await user.type(screen.getByLabelText('Obra'), 'obra-1');

    expect(onChange).toHaveBeenCalledWith({
      categoria: 'CONEXO',
      titularId: '',
      obraId: '',
    });
    expect(onChange).toHaveBeenLastCalledWith({
      categoria: 'CONEXO',
      titularId: 'titular-1',
      obraId: 'obra-1',
    });
  });
});
