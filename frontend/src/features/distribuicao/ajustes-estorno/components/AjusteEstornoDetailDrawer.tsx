import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { useAjusteEstorno } from '../hooks/useAjusteEstorno';
import { formatCurrency, formatDateTime } from '../../processos/utils/calculoFormatters';
import { AjusteEstornoStatusBadge } from './AjusteEstornoStatusBadge';
import type { AjusteEstornoHistoricoItem, AjusteEstornoLinha } from '../types/ajusteEstorno';
import styles from './AjusteEstornoDetailDrawer.module.css';

interface AjusteEstornoDetailDrawerProps {
  ajusteId: string | null;
  onClose: () => void;
}

function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

function optionalDate(value: string | null | undefined): string {
  return value ? formatDateTime(value) : '—';
}

function LinhasTable({ linhas }: { linhas: AjusteEstornoLinha[] }) {
  if (linhas.length === 0) {
    return <p className={styles.emptyText}>Nenhuma linha de ajuste.</p>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.compactTable} aria-label="Linhas do ajuste">
        <thead>
          <tr>
            <th>Titular</th>
            <th>Obra</th>
            <th>Categoria</th>
            <th>Valor crédito origem</th>
            <th>Valor ajuste</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id}>
              <td>
                <strong>{linha.titularNome}</strong>
                <span>{shortId(linha.titularId)}</span>
              </td>
              <td>
                <strong>{linha.obraTitulo}</strong>
                <span>{shortId(linha.obraId)}</span>
              </td>
              <td>
                {linha.categoria}
                {linha.subcategoriaConexa && (
                  <span>{linha.subcategoriaConexa}</span>
                )}
              </td>
              <td className={styles.mono}>{formatCurrency(linha.valorCreditoOrigem)}</td>
              <td className={styles.negativeValue}>{formatCurrency(linha.valorAjuste)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoricoTable({ historico }: { historico: AjusteEstornoHistoricoItem[] }) {
  if (historico.length === 0) {
    return <p className={styles.emptyText}>Sem histórico registrado.</p>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.compactTable} aria-label="Histórico de aplicação">
        <thead>
          <tr>
            <th>Status</th>
            <th>Processo</th>
            <th>Ocorrido em</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((item, i) => (
            <tr key={i}>
              <td><AjusteEstornoStatusBadge status={item.status} /></td>
              <td className={styles.mono}>{shortId(item.processoId)}</td>
              <td className={styles.mono}>{formatDateTime(item.ocorridoEm)}</td>
              <td>{item.observacao ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AjusteEstornoDetailDrawer({ ajusteId, onClose }: AjusteEstornoDetailDrawerProps) {
  const { data, isLoading, error } = useAjusteEstorno(ajusteId);

  return (
    <>
      <div
        className={`${styles.overlay} ${ajusteId ? styles.open : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`${styles.drawer} ${ajusteId ? styles.open : ''}`}
        aria-labelledby="drawer-title"
        aria-hidden={!ajusteId}
        role="dialog"
      >
        <div className={styles.drawerHeader}>
          <h2 id="drawer-title" className={styles.drawerTitle}>
            Detalhe do Ajuste
            {data && (
              <span className={styles.drawerSubtitle}>{shortId(data.id)}</span>
            )}
          </h2>
          <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Fechar drawer">
            <X size={18} />
          </Button>
        </div>

        <div className={styles.drawerBody}>
          {isLoading && <Loading />}

          {error && (
            <p className={styles.errorText}>Erro ao carregar detalhes do ajuste.</p>
          )}

          {data && (
            <>
              {data.status === 'ERRO_INTEGRIDADE' && (
                <div className={styles.integrityAlert} role="alert">
                  <AlertTriangle size={16} />
                  <span>Este ajuste apresenta erro de integridade e requer atenção operacional.</span>
                </div>
              )}

              <section className={styles.section} aria-labelledby="secao-geral">
                <h3 id="secao-geral" className={styles.sectionTitle}>Dados gerais</h3>
                <dl className={styles.dl}>
                  <dt>Status</dt>
                  <dd><AjusteEstornoStatusBadge status={data.status} /></dd>

                  <dt>Rubrica</dt>
                  <dd><span className={styles.mono}>{data.rubrica.sigla}</span> — {data.rubrica.nome}</dd>

                  <dt>Período origem</dt>
                  <dd className={styles.mono}>{data.periodoOrigem}</dd>

                  <dt>Pagamento ID</dt>
                  <dd className={styles.mono}>{data.pagamentoId}</dd>

                  <dt>Licença ID</dt>
                  <dd className={styles.mono}>{data.licencaId}</dd>

                  <dt>Estornado por</dt>
                  <dd>{data.estornadoPor}</dd>

                  <dt>Estornado em</dt>
                  <dd className={styles.mono}>{formatDateTime(data.estornadoEm)}</dd>

                  <dt>Recebido em</dt>
                  <dd className={styles.mono}>{formatDateTime(data.recebidoEm)}</dd>

                  <dt>Previsto em</dt>
                  <dd className={styles.mono}>{optionalDate(data.previstoEm)}</dd>

                  <dt>Aplicado em</dt>
                  <dd className={styles.mono}>{optionalDate(data.aplicadoEm)}</dd>

                  <dt>Valor bruto estornado</dt>
                  <dd className={styles.negativeValue}>{formatCurrency(data.valorEstornadoBruto)}</dd>

                  <dt>Valor ajuste líquido</dt>
                  <dd className={styles.negativeValue}>{formatCurrency(data.valorAjusteLiquido)}</dd>

                  <dt>Valor aplicado</dt>
                  <dd className={styles.mono}>
                    {data.valorAplicado !== null ? formatCurrency(data.valorAplicado) : '—'}
                  </dd>

                  <dt>Justificativa</dt>
                  <dd>{data.justificativa}</dd>
                </dl>
              </section>

              <section className={styles.section} aria-labelledby="secao-processos">
                <h3 id="secao-processos" className={styles.sectionTitle}>Processos</h3>
                <dl className={styles.dl}>
                  <dt>Processo origem</dt>
                  <dd>
                    {data.processoOrigem ? (
                      <span>
                        <span className={styles.mono}>{shortId(data.processoOrigem.id)}</span>
                        {' '}— {data.processoOrigem.rubricaSigla} {data.processoOrigem.periodo}
                        {' '}· {data.processoOrigem.status}
                      </span>
                    ) : '—'}
                  </dd>

                  <dt>Processo aplicação</dt>
                  <dd>
                    {data.processoAplicacao ? (
                      <span>
                        <span className={styles.mono}>{shortId(data.processoAplicacao.id)}</span>
                        {' '}— {data.processoAplicacao.rubricaSigla} {data.processoAplicacao.periodo}
                        {' '}· {data.processoAplicacao.status}
                      </span>
                    ) : '—'}
                  </dd>
                </dl>
              </section>

              <section className={styles.section} aria-labelledby="secao-linhas">
                <h3 id="secao-linhas" className={styles.sectionTitle}>
                  Linhas do ajuste ({data.linhas.length})
                </h3>
                <LinhasTable linhas={data.linhas} />
              </section>

              <section className={styles.section} aria-labelledby="secao-historico">
                <h3 id="secao-historico" className={styles.sectionTitle}>Histórico de aplicação</h3>
                <HistoricoTable historico={data.historicoAplicacao} />
              </section>

              <section className={styles.section} aria-labelledby="secao-payload">
                <h3 id="secao-payload" className={styles.sectionTitle}>Payload original</h3>
                <pre className={styles.payload}>
                  {JSON.stringify(data.payloadOriginal, null, 2)}
                </pre>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
