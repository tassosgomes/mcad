import { useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { usePermissions } from '@shared/authz';
import { UdaVigenteCard } from '../components/UdaVigenteCard';
import { UdaHistoricoTable } from '../components/UdaHistoricoTable';
import { AjustarUdaModal } from '../components/AjustarUdaModal';
import styles from './UdaPage.module.css';

export function UdaPage() {
  const { can } = usePermissions();
  const isAnalista = can('arrecadacao:default:cobranca:emitir');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Unidade de Desconto por Acervo (UDA)"
        description="Gerencie o valor vigente e o histórico de ajustes da UDA."
      />

      <div className={styles.content}>
        <UdaVigenteCard onAjustar={() => setShowModal(true)} isAnalista={isAnalista} />

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Histórico de Valores</h2>
          <UdaHistoricoTable />
        </div>
      </div>

      <AjustarUdaModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
