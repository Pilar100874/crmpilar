import { useState } from 'react';
import { toast } from 'sonner';

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
}

export const useCNPJLookup = () => {
  const [loading, setLoading] = useState(false);

  const lookupCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ inválido');
      return null;
    }

    setLoading(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        toast.error('CNPJ não encontrado');
        setLoading(false);
        return null;
      }

      const data = await response.json();

      setLoading(false);
      return {
        cnpj: data.cnpj,
        nome: data.razao_social || data.nome_fantasia,
        fantasia: data.nome_fantasia || data.razao_social,
        logradouro: data.descricao_tipo_de_logradouro + ' ' + data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        telefone: data.ddd_telefone_1 || '',
        email: data.email || '',
      };
    } catch (error) {
      toast.error('Erro ao buscar CNPJ. Verifique se está correto.');
      setLoading(false);
      return null;
    }
  };

  return { lookupCNPJ, loading };
};
