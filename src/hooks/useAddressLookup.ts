import { useState } from 'react';
import { toast } from 'sonner';

export interface AddressData {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento?: string;
}

export const useAddressLookup = () => {
  const [loading, setLoading] = useState(false);

  const lookupCEP = async (cep: string): Promise<AddressData | null> => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      toast.error('CEP inválido');
      return null;
    }

    setLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return {
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        complemento: data.complemento,
      };
    } catch (error) {
      toast.error('Erro ao buscar CEP');
      setLoading(false);
      return null;
    }
  };

  return { lookupCEP, loading };
};
