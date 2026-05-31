export type ActorDisplayStatus = 'ATIVO' | 'SUSPENSO' | 'REMOVIDO' | 'DESCONHECIDO';

export interface ActorDisplayResponse {
  subject: string | null;
  label: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  status: ActorDisplayStatus;
}
