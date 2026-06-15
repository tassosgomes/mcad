import { useState, useEffect, useCallback } from 'react';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { useToast } from '@components/ui/toast';
import { useContato, useAtualizarContato } from '../../contato/hooks/useContato';
import type { Endereco, Telefone } from '../../contato/types/contato';
import type { ViaCepResponse } from '../../contato/types/contato';
import styles from './ContatoPage.module.css';

const TIPO_TELEFONE_OPTIONS = [
  { value: 'CELULAR' as const, label: 'Celular' },
  { value: 'RESIDENCIAL' as const, label: 'Residencial' },
  { value: 'COMERCIAL' as const, label: 'Comercial' },
];

export function ContatoPage() {
  const { showToast } = useToast();
  const { data: contato, isLoading } = useContato();
  const updateMutation = useAtualizarContato();

  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [telefones, setTelefones] = useState<Telefone[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (contato) {
      setEmail(contato.email ?? '');
      if (contato.endereco) {
        setCep(contato.endereco.cep);
        setLogradouro(contato.endereco.logradouro);
        setNumero(contato.endereco.numero);
        setComplemento(contato.endereco.complemento ?? '');
        setBairro(contato.endereco.bairro);
        setCidade(contato.endereco.cidade);
        setUf(contato.endereco.uf);
      }
      setTelefones(contato.telefones ?? []);
    }
  }, [contato]);

  const buscarCep = useCallback(async (cepValue: string) => {
    const limpo = cepValue.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        showToast('CEP não encontrado. Preencha o endereço manualmente.', 'error');
        return;
      }
      setLogradouro(data.logradouro);
      setBairro(data.bairro);
      setCidade(data.localidade);
      setUf(data.uf);
      setComplemento(data.complemento);
    } catch {
      showToast('Erro ao consultar CEP. Preencha o endereço manualmente.', 'error');
    } finally {
      setCepLoading(false);
    }
  }, [showToast]);

  function handleCepBlur() {
    if (cep && cep.replace(/\D/g, '').length === 8) {
      buscarCep(cep);
    }
  }

  function addTelefone() {
    if (telefones.length >= 5) {
      showToast('Limite máximo de 5 telefones atingido.', 'error');
      return;
    }
    setTelefones((prev) => [...prev, { tipo: 'CELULAR', numero: '' }]);
  }

  function removeTelefone(index: number) {
    setTelefones((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTelefone(index: number, field: 'tipo' | 'numero', value: string) {
    setTelefones((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }
    if (cep && cep.replace(/\D/g, '').length !== 8) {
      newErrors.cep = 'CEP deve ter 8 dígitos';
    }
    if (uf && uf.length !== 2) {
      newErrors.uf = 'UF deve ter 2 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).every((k) => !newErrors[k]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const endereco: Endereco | null = cep
      ? {
          cep: cep.replace(/\D/g, ''),
          logradouro,
          numero: numero || 'S/N',
          complemento: complemento || null,
          bairro,
          cidade,
          uf: uf.toUpperCase(),
        }
      : null;

    try {
      await updateMutation.mutateAsync({
        email: email || null,
        endereco,
        telefones: telefones.filter((t) => t.numero.trim()),
      });
      showToast('Dados de contato atualizados com sucesso!', 'success');
    } catch (err: unknown) {
      const problem = err as { detail?: string; title?: string };
      showToast(problem.detail || problem.title || 'Erro ao atualizar contato', 'error');
    }
  }

  if (isLoading) return <Loading />;

  return (
    <div className={styles.page}>
      <PageHeader title="Dados de Contato" description="Gerencie seu endereço, e-mail e telefones." />
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField label="E-mail" error={errors.email}>
            <TextInput
              id="contato-email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (errors.email) setErrors((p) => ({ ...p, email: '' }));
              }}
              placeholder="seu@email.com"
              type="email"
            />
          </FormField>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Endereço</legend>
            <div className={styles.grid}>
              <div className={styles.cepRow}>
                <div className={styles.cepField}>
                  <FormField label="CEP" error={errors.cep}>
                    <TextInput
                      id="contato-cep"
                      value={cep}
                      onChange={(v) => {
                        setCep(v);
                        if (errors.cep) setErrors((p) => ({ ...p, cep: '' }));
                      }}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {cepLoading && <span className={styles.cepLoading}>Buscando...</span>}
                  </FormField>
                </div>
              </div>

              <FormField label="Logradouro">
                <TextInput
                  id="contato-logradouro"
                  value={logradouro}
                  onChange={setLogradouro}
                  placeholder="Rua, Avenida..."
                />
              </FormField>

              <div className={styles.numeroComplemento}>
                <FormField label="Número">
                  <TextInput
                    id="contato-numero"
                    value={numero}
                    onChange={setNumero}
                    placeholder="S/N"
                  />
                </FormField>
                <FormField label="Complemento">
                  <TextInput
                    id="contato-complemento"
                    value={complemento}
                    onChange={setComplemento}
                    placeholder="Apto, Bloco..."
                  />
                </FormField>
              </div>

              <FormField label="Bairro">
                <TextInput
                  id="contato-bairro"
                  value={bairro}
                  onChange={setBairro}
                  placeholder="Bairro"
                />
              </FormField>

              <div className={styles.cidadeUf}>
                <FormField label="Cidade">
                  <TextInput
                    id="contato-cidade"
                    value={cidade}
                    onChange={setCidade}
                    placeholder="Cidade"
                  />
                </FormField>
                <FormField label="UF" error={errors.uf}>
                  <TextInput
                    id="contato-uf"
                    value={uf}
                    onChange={(v) => {
                      setUf(v);
                      if (errors.uf) setErrors((p) => ({ ...p, uf: '' }));
                    }}
                    placeholder="SP"
                    maxLength={2}
                  />
                </FormField>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Telefones</legend>
            {telefones.length === 0 && (
              <p className={styles.emptyHint}>Nenhum telefone cadastrado.</p>
            )}
            {telefones.map((tel, index) => (
              <div key={index} className={styles.telefoneRow}>
                <Select
                  value={tel.tipo}
                  onChange={(v) => updateTelefone(index, 'tipo', v)}
                  options={TIPO_TELEFONE_OPTIONS}
                  aria-label={`Tipo do telefone ${index + 1}`}
                />
                <TextInput
                  value={tel.numero}
                  onChange={(v) => updateTelefone(index, 'numero', v)}
                  placeholder="(11) 99999-0000"
                  aria-label={`Número do telefone ${index + 1}`}
                />
                <button
                  className={styles.removeTelefoneBtn}
                  type="button"
                  onClick={() => removeTelefone(index)}
                  aria-label={`Remover telefone ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className={styles.addTelefoneBtn}
              type="button"
              onClick={addTelefone}
              disabled={telefones.length >= 5}
            >
              + Adicionar Telefone
            </button>
          </fieldset>

          <div className={styles.actions}>
            <Button variant="primary" type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
