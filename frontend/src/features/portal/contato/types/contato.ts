export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Telefone {
  tipo: 'CELULAR' | 'RESIDENCIAL' | 'COMERCIAL';
  numero: string;
}

export interface Contato {
  email: string | null;
  endereco: Endereco | null;
  telefones: Telefone[];
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AtualizarContatoRequest {
  email: string | null;
  endereco: Endereco | null;
  telefones: Telefone[];
}
