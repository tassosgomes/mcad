import { useState, useRef, useEffect } from 'react';
import { Music, FileText, Plus, X } from 'lucide-react';
import { useBuscaCadastro } from '../hooks/useBuscaCadastro';
import { ObraFonogramaSelecionado, ResultadoBusca } from '../types/execucao';
import { CriarObraPendenteModal } from './CriarObraPendenteModal';
import { CriarFonogramaPendenteModal } from './CriarFonogramaPendenteModal';
import { Badge } from '@shared/components/ui/badge';
import styles from './BuscaCadastroAutocomplete.module.css';

interface BuscaCadastroAutocompleteProps {
  value: ObraFonogramaSelecionado | null;
  onChange: (value: ObraFonogramaSelecionado | null) => void;
  error?: boolean;
}

export function BuscaCadastroAutocomplete({
  value,
  onChange,
  error,
}: BuscaCadastroAutocompleteProps) {
  const [termo, setTermo] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [showObraModal, setShowObraModal] = useState(false);
  const [showFonoModal, setShowFonoModal] = useState(false);

  const { data: resultados, isLoading } = useBuscaCadastro(termo);

  // Close dropdown when typing completely empty or clicking outside
  useEffect(() => {
    if (!termo) setIsOpen(false);

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [termo]);

  const handleSelect = (item: ResultadoBusca) => {
    const obraId = item.tipo === 'fonograma' ? item.obraId : item.id;
    if (!obraId) return;
    onChange({
      obraId,
      fonogramaId: item.tipo === 'fonograma' ? item.id : null,
      titulo: item.titulo,
    });
    setTermo('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setTermo('');
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {value ? (
        <div
          className={`${styles.selectedCard} ${error ? styles.error : ''}`}
        >
          <div className={styles.selectedInfo}>
            <span className={styles.selectedType}>
              {value.fonogramaId ? '🎵 Fonograma' : '📝 Obra'}
            </span>
            <span className={styles.selectedTitle}>{value.titulo}</span>
          </div>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Limpar seleção"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.input}
              style={{ borderColor: error ? 'var(--color-danger)' : undefined }}
              placeholder="Busque por Título, ISRC, ISWC ou Autor..."
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (termo.length >= 3) setIsOpen(true);
              }}
            />
            {termo && (
              <button type="button" className={styles.clearBtn} onClick={() => setTermo('')}>
                <X size={16} />
              </button>
            )}
          </div>

          {isOpen && termo.length >= 3 && (
            <div className={styles.dropdown}>
              {isLoading ? (
                <div className={styles.loading}>Buscando...</div>
              ) : !resultados || resultados.length === 0 ? (
                <div className={styles.empty}>Nenhum resultado encontrado.</div>
              ) : (
                resultados.map((item) => (
                  <div
                    key={item.id}
                    className={styles.resultItem}
                    onClick={() => handleSelect(item)}
                  >
                    <div className={styles.itemHeader}>
                      <div className={styles.titleArea}>
                        {item.tipo === 'fonograma' ? (
                          <Music size={14} className={styles.icon} />
                        ) : (
                          <FileText size={14} className={styles.icon} />
                        )}
                        <span>{item.titulo}</span>
                      </div>
                      <Badge variant={item.status === 'LIBERADA' || item.status === 'LIBERADO' ? 'success' : 'warning'}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className={styles.itemBody}>
                      {item.codigoIdentificador && (
                        <span>
                          {item.tipo === 'fonograma' ? 'ISRC: ' : 'ISWC: '}
                          <span className={styles.idCode}>{item.codigoIdentificador}</span>
                        </span>
                      )}
                      {item.autoresOuInterpretes && (
                        <span>{item.autoresOuInterpretes}</span>
                      )}
                    </div>
                  </div>
                ))
              )}

              <div className={styles.footer}>
                <span className={styles.footerText}>Não encontrou o que procurava?</span>
                <div className={styles.footerActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => {
                      setIsOpen(false);
                      setShowObraModal(true);
                    }}
                  >
                    <Plus size={12} style={{ marginRight: 4, display: 'inline-block' }} />
                    Criar Obra
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    title="Crie uma obra pendente primeiro para depois vincular o fonograma."
                    disabled
                  >
                    <Plus size={12} style={{ marginRight: 4, display: 'inline-block' }} />
                    Criar Fonograma
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showObraModal && (
        <CriarObraPendenteModal
          isOpen={showObraModal}
          onClose={() => setShowObraModal(false)}
          initialTitulo={termo}
          onCreated={(obraData) => {
            onChange(obraData);
            setTermo('');
            setShowObraModal(false);
            setShowFonoModal(true);
          }}
        />
      )}

      {showFonoModal && value?.obraId && !value.fonogramaId && (
        <CriarFonogramaPendenteModal
          isOpen={showFonoModal}
          onClose={() => setShowFonoModal(false)}
          obraVinculada={{ id: value.obraId, titulo: value.titulo }}
          onCreated={(fonoData) => {
            onChange(fonoData);
            setShowFonoModal(false);
          }}
        />
      )}
    </div>
  );
}
