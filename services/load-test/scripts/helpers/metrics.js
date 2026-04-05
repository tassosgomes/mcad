import { Counter } from 'k6/metrics';

export const metrics = {
  obrasCriadas: new Counter('obras_criadas'),
  fonogramasCriados: new Counter('fonogramas_criados'),
  titularesCriados: new Counter('titulares_criados'),
  depuracoes: new Counter('depuracoes'),
  bloqueios: new Counter('bloqueios'),
};
