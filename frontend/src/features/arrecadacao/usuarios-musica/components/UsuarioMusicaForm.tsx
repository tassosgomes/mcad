import { useState, type FormEvent } from 'react';
import { Button } from '@components/ui/button';
import { FormField } from '@components/ui/form-field';
import { TextInput } from '@components/ui/text-input';
import { usePermissions } from '@shared/authz';
import type {
  AtualizarUsuarioMusicaRequest,
  CriarUsuarioMusicaRequest,
  Endereco,
  UsuarioMusica,
} from '../types/usuario-musica';
import { formatCep, formatCnpj, normalizeNullable, onlyAlphanumeric, onlyDigits } from '../utils/formatters';
import { isValidCnpj } from '../utils/cnpjValidator';
import styles from './UsuarioMusicaForm.module.css';

type UsuarioMusicaFormPayload = CriarUsuarioMusicaRequest | AtualizarUsuarioMusicaRequest;

interface UsuarioMusicaFormProps {
  initialData?: UsuarioMusica;
  onSubmit: (data: UsuarioMusicaFormPayload) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

const EMPTY_ENDERECO: Endereco = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: null,
  bairro: '',
  cidade: '',
  uf: '',
};

export function UsuarioMusicaForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: UsuarioMusicaFormProps) {
  const { can } = usePermissions();
  const canWrite = can('arrecadacao:default:cliente:editar');
  const isEditMode = !!initialData;

  const [razaoSocial, setRazaoSocial] = useState(initialData?.razaoSocial ?? '');
  const [nomeFantasia, setNomeFantasia] = useState(initialData?.nomeFantasia ?? '');
  const [cnpjDisplay, setCnpjDisplay] = useState(formatCnpj(initialData?.cnpj ?? ''));
  const [cepDisplay, setCepDisplay] = useState(formatCep(initialData?.endereco.cep ?? ''));
  const [logradouro, setLogradouro] = useState(initialData?.endereco.logradouro ?? '');
  const [numero, setNumero] = useState(initialData?.endereco.numero ?? '');
  const [complemento, setComplemento] = useState(initialData?.endereco.complemento ?? '');
  const [bairro, setBairro] = useState(initialData?.endereco.bairro ?? '');
  const [cidade, setCidade] = useState(initialData?.endereco.cidade ?? '');
  const [uf, setUf] = useState(initialData?.endereco.uf ?? '');
  const [nomeResponsavel, setNomeResponsavel] = useState(initialData?.contato.nomeResponsavel ?? '');
  const [telefone, setTelefone] = useState(initialData?.contato.telefone ?? '');
  const [email, setEmail] = useState(initialData?.contato.email ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepInfo, setCepInfo] = useState('');

  function setFieldError(field: string, message: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function validateCnpj(): boolean {
    if (isEditMode) return true;
    const raw = onlyAlphanumeric(cnpjDisplay);
    if (!raw) {
      setFieldError('cnpj', 'CNPJ é obrigatório');
      return false;
    }
    if (!isValidCnpj(raw)) {
      setFieldError('cnpj', 'CNPJ inválido');
      return false;
    }
    setFieldError('cnpj', '');
    return true;
  }

  async function buscarCep() {
    const cep = onlyDigits(cepDisplay);
    if (cep.length !== 8) return;

    setCepInfo('Consultando CEP...');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as ViaCepResponse;
      if (!response.ok || data.erro) {
        setCepInfo('CEP não localizado. Preencha o endereço manualmente.');
        return;
      }
      setLogradouro(data.logradouro ?? logradouro);
      setBairro(data.bairro ?? bairro);
      setCidade(data.localidade ?? cidade);
      setUf((data.uf ?? uf).toUpperCase());
      setCepInfo('');
    } catch {
      setCepInfo('ViaCEP indisponível. Preencha o endereço manualmente.');
    }
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    const rawCnpj = onlyAlphanumeric(cnpjDisplay);
    const rawCep = onlyDigits(cepDisplay);

    if (razaoSocial.trim().length < 3) nextErrors.razaoSocial = 'Razão social deve ter no mínimo 3 caracteres';
    if (!isEditMode && !rawCnpj) nextErrors.cnpj = 'CNPJ é obrigatório';
    if (!isEditMode && rawCnpj && !isValidCnpj(rawCnpj)) nextErrors.cnpj = 'CNPJ inválido';
    if (rawCep.length !== 8) nextErrors.cep = 'CEP deve ter 8 dígitos';
    if (!logradouro.trim()) nextErrors.logradouro = 'Logradouro é obrigatório';
    if (!numero.trim()) nextErrors.numero = 'Número é obrigatório';
    if (!bairro.trim()) nextErrors.bairro = 'Bairro é obrigatório';
    if (!cidade.trim()) nextErrors.cidade = 'Cidade é obrigatória';
    if (!/^[A-Z]{2}$/.test(uf.trim().toUpperCase())) nextErrors.uf = 'UF deve ter 2 letras';
    if (!nomeResponsavel.trim()) nextErrors.nomeResponsavel = 'Responsável é obrigatório';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'E-mail inválido';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const endereco: Endereco = {
      cep: onlyDigits(cepDisplay),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: normalizeNullable(complemento),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(),
    };

    const basePayload = {
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: normalizeNullable(nomeFantasia),
      endereco,
      contato: {
        nomeResponsavel: nomeResponsavel.trim(),
        telefone: normalizeNullable(telefone),
        email: normalizeNullable(email),
      },
    };

    if (isEditMode) {
      onSubmit(basePayload);
      return;
    }

    onSubmit({
      ...basePayload,
      cnpj: onlyAlphanumeric(cnpjDisplay),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Identificação</h2>
        <div className={styles.grid}>
          <FormField label="Razão social" required error={errors.razaoSocial} className={styles.fullWidth}>
            <TextInput
              id="usuario-musica-razao-social"
              value={razaoSocial}
              onChange={setRazaoSocial}
              placeholder="Razão social"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="Nome fantasia" className={styles.fullWidth}>
            <TextInput
              id="usuario-musica-nome-fantasia"
              value={nomeFantasia}
              onChange={setNomeFantasia}
              placeholder="Nome fantasia"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="CNPJ" required={!isEditMode} error={errors.cnpj}>
            <TextInput
              id="usuario-musica-cnpj"
              value={cnpjDisplay}
              onChange={(value) => {
                setCnpjDisplay(formatCnpj(value));
                if (errors.cnpj) setFieldError('cnpj', '');
              }}
              onBlur={validateCnpj}
              placeholder="00.000.000/0000-00"
              disabled={isEditMode || !canWrite}
              mono
            />
          </FormField>
          {isEditMode && (
            <FormField label="Status">
              <TextInput
                id="usuario-musica-status"
                value={initialData.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                onChange={() => undefined}
                disabled
              />
            </FormField>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Endereço</h2>
        <div className={styles.grid}>
          <FormField label="CEP" required error={errors.cep}>
            <TextInput
              id="usuario-musica-cep"
              value={cepDisplay}
              onChange={(value) => {
                setCepDisplay(formatCep(value));
                setCepInfo('');
              }}
              onBlur={buscarCep}
              placeholder="00000-000"
              disabled={!canWrite}
              mono
            />
            {cepInfo && <span className={styles.hint}>{cepInfo}</span>}
          </FormField>
          <FormField label="UF" required error={errors.uf}>
            <TextInput
              id="usuario-musica-uf"
              value={uf}
              onChange={(value) => setUf(value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              disabled={!canWrite}
              mono
            />
          </FormField>
          <FormField label="Logradouro" required error={errors.logradouro} className={styles.fullWidth}>
            <TextInput
              id="usuario-musica-logradouro"
              value={logradouro}
              onChange={setLogradouro}
              placeholder="Rua, avenida, praça"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="Número" required error={errors.numero}>
            <TextInput
              id="usuario-musica-numero"
              value={numero}
              onChange={setNumero}
              placeholder="Número"
              disabled={!canWrite}
              mono
            />
          </FormField>
          <FormField label="Complemento">
            <TextInput
              id="usuario-musica-complemento"
              value={complemento}
              onChange={setComplemento}
              placeholder="Sala, bloco, andar"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="Bairro" required error={errors.bairro}>
            <TextInput
              id="usuario-musica-bairro"
              value={bairro}
              onChange={setBairro}
              placeholder="Bairro"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="Cidade" required error={errors.cidade}>
            <TextInput
              id="usuario-musica-cidade"
              value={cidade}
              onChange={setCidade}
              placeholder="Cidade"
              disabled={!canWrite}
            />
          </FormField>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contato</h2>
        <div className={styles.grid}>
          <FormField label="Responsável" required error={errors.nomeResponsavel} className={styles.fullWidth}>
            <TextInput
              id="usuario-musica-responsavel"
              value={nomeResponsavel}
              onChange={setNomeResponsavel}
              placeholder="Nome do responsável"
              disabled={!canWrite}
            />
          </FormField>
          <FormField label="Telefone">
            <TextInput
              id="usuario-musica-telefone"
              value={telefone}
              onChange={setTelefone}
              placeholder="(00) 00000-0000"
              disabled={!canWrite}
              mono
            />
          </FormField>
          <FormField label="E-mail" error={errors.email}>
            <TextInput
              id="usuario-musica-email"
              value={email}
              onChange={setEmail}
              placeholder="contato@empresa.com.br"
              disabled={!canWrite}
            />
          </FormField>
        </div>
      </section>

      {canWrite && (
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Cadastrar usuário'}
          </Button>
        </div>
      )}
    </form>
  );
}

export const emptyEndereco = EMPTY_ENDERECO;
