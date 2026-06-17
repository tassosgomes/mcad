import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { RegistrarPagamentoForm } from '../components/RegistrarPagamentoForm';
import type { Pagamento } from '../types/pagamento';
import styles from './PagamentoCreatePage.module.css';

export function PagamentoCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  function handleSuccess(pagamento: Pagamento) {
    const message = pagamento.status === 'BOLETO_EMITIDO'
      ? 'Boleto emitido com sucesso'
      : 'Pagamento registrado com sucesso';
    showToast(message, 'success');
    navigate(`/arrecadacao/pagamentos/${pagamento.id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/pagamentos')}
          type="button"
          id="btn-back-criar-pagamento"
        >
          <ArrowLeft size={16} /> Pagamentos
        </Button>
        <PageHeader
          title="Novo Pagamento"
          description="Registrar um pagamento de licença de execução pública em UDAs."
        />
      </div>
      <div className={styles.card}>
        <RegistrarPagamentoForm
          onSuccess={handleSuccess}
          onCancel={() => navigate('/arrecadacao/pagamentos')}
        />
      </div>
    </div>
  );
}
