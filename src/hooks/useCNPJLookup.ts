import { useState } from 'react';
import { toast } from '@/lib/toast-config';
import { buscarCNPJ, type CnpjResultado } from '@/lib/cadastros/cnpjService';

// Formato legado mantido para compatibilidade com telas existentes.
export interface CNPJData {
  cnpj: string;
  nome: string;
  fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  // Novos campos (opcionais para não quebrar consumidores existentes)
  situacaoCadastral?: string;
  dataAbertura?: string;
  naturezaJuridica?: string;
  capitalSocial?: number | null;
  porte?: string;
  regimeTributario?: string;
  optanteMei?: boolean | null;
  optanteSimples?: boolean | null;
  cnaePrincipal?: string;
  cnaePrincipalDescricao?: string;
  cnaesSecundarios?: { codigo: string; descricao: string }[];
  pais?: string;
}

function mapToLegacy(r: CnpjResultado): CNPJData {
  return {
    cnpj: r.cnpj,
    nome: r.razaoSocial,
    fantasia: r.nomeFantasia || r.razaoSocial,
    logradouro: r.logradouro,
    numero: r.numero,
    complemento: r.complemento,
    bairro: r.bairro,
    municipio: r.cidade,
    uf: r.uf,
    cep: r.cep,
    telefone: r.telefone,
    email: r.email,
    situacaoCadastral: r.situacaoCadastral,
    dataAbertura: r.dataAbertura,
    naturezaJuridica: r.naturezaJuridica,
    capitalSocial: r.capitalSocial,
    porte: r.porte,
    regimeTributario: r.regimeTributario,
    optanteMei: r.optanteMei,
    optanteSimples: r.optanteSimples,
    cnaePrincipal: r.cnaePrincipal?.codigo,
    cnaePrincipalDescricao: r.cnaePrincipal?.descricao,
    cnaesSecundarios: r.cnaesSecundarios,
    pais: r.pais,
  };
}

export const useCNPJLookup = () => {
  const [loading, setLoading] = useState(false);

  const lookupCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    const clean = (cnpj || '').replace(/\D/g, '');
    if (clean.length !== 14) {
      toast.error('CNPJ inválido');
      return null;
    }
    setLoading(true);
    try {
      const r = await buscarCNPJ(clean);
      if (!r) {
        toast.error('CNPJ não encontrado — preencha manualmente');
        return null;
      }
      return mapToLegacy(r);
    } catch (e) {
      toast.error('Erro ao buscar CNPJ');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookupCNPJ, loading };
};
