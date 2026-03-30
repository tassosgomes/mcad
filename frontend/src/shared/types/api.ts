// RFC 7807 ProblemDetails — formato padrão de erro da API
export interface ProblemDetails {
  status: number;
  title: string;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
