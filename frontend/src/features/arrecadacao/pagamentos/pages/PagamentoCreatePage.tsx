import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { RegistrarPagamentoForm } from '../components/RegistrarPagamentoForm';
import styles from './PagamentoCreatePage.module.css';

export function PagamentoCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  function handleSuccess(id: string) {
    showToast('Pagamento registrado com sucesso', 'success');
    navigate(`/arrecadacao/pagamentos/${id}`);
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
