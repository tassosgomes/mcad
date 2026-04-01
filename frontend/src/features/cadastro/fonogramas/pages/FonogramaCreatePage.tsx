import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { Button } from '@components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateFonograma } from '../hooks/useCreateFonograma';
import { useObras } from '../../obras/hooks/useObras';
import { FonogramaForm } from '../components/FonogramaForm';

export function FonogramaCreatePage() {
  const [searchParams] = useSearchParams();
  const obraId = searchParams.get('obraId');
  
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateFonograma();
  
  // Se veio obraId na URL, buscar o título dela para preencher
  const queryParams = obraId ? { size: 1, page: 1, id: obraId } : { size: 1, page: 1 };
  const { data: obrasData } = useObras(queryParams as any);
  const obraTitulo = obrasData?.data?.find(o => o.id === obraId)?.titulo || '';

  const handleSubmit = async (data: any) => {
    try {
      const response = await createMutation.mutateAsync(data);
      showToast('Fonograma criado com sucesso!', 'success');
      navigate(`/cadastro/fonogramas/${response.id}`);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao criar fonograma.', 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/fonogramas')}
          type="button"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
      <PageHeader
        title="Novo Fonograma"
        description="Registre um novo fonograma associado a uma Obra Musical."
      />
      <div style={{ marginTop: '2rem' }}>
        <FonogramaForm
          initialObraId={obraId || undefined}
          initialObraTitulo={obraTitulo}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
