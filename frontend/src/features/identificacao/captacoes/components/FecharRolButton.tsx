import { Button } from '@components/ui/button';

interface FecharRolButtonProps {
  onClick: () => void;
}

export function FecharRolButton({ onClick }: FecharRolButtonProps) {
  return (
    <Button variant="primary" onClick={onClick}>
      Fechar Rol
    </Button>
  );
}
