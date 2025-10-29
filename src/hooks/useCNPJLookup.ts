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

      // Processar telefone: pegar primeiro se houver vários, adicionar +55 e limitar a 13 dígitos
      let telefoneProcessado = '';
      if (data.ddd_telefone_1) {
        // Se houver múltiplos telefones separados, pegar apenas o primeiro
        let primeiroTelefone = data.ddd_telefone_1.split(/[,;]/)[0].trim();
        
        // Remover todos os caracteres não numéricos
        let telefoneNumeros = primeiroTelefone.replace(/\D/g, '');
        
        // Se não começar com 55, adicionar código do país
        if (!telefoneNumeros.startsWith('55')) {
          telefoneNumeros = '55' + telefoneNumeros;
        }
        
        // Limitar a 13 dígitos (55 + 11 dígitos)
        telefoneProcessado = telefoneNumeros.substring(0, 13);
      }

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
        telefone: telefoneProcessado,
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
