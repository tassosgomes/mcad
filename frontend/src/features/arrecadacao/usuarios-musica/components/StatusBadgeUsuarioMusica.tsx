import { Badge } from '@components/ui/badge';
import type { StatusUsuarioMusica } from '../types/usuario-musica';

interface StatusBadgeUsuarioMusicaProps {
  status: StatusUsuarioMusica;
}

const STATUS_LABEL: Record<StatusUsuarioMusica, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
};

const STATUS_VARIANT: Record<StatusUsuarioMusica, 'success' | 'muted'> = {
  ATIVO: 'success',
  INATIVO: 'muted',
};

export function StatusBadgeUsuarioMusica({ status }: StatusBadgeUsuarioMusicaProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
