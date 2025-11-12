import { useState } from 'react';
import { toast } from '@/lib/toast-config';
import { supabase } from '@/integrations/supabase/client';

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

      // Fallback para e-mail/telefone via função backend se BrasilAPI não retornar
      let email = data.email || '';
      if (!email || email.trim() === '') {
        try {
          const { data: fnData, error } = await supabase.functions.invoke('consultar-cnpj', {
            body: { cnpj: cleanCNPJ },
          });
          if (!error && fnData) {
            const empresa = fnData?.empresaData || fnData?.empresa || fnData?.data || fnData;
            if (empresa?.email) {
              email = empresa.email;
            }
            if (!telefoneProcessado && (empresa?.telefone || empresa?.phone)) {
              let primeiroTelefone2 = String(empresa.telefone || empresa.phone).split(/[,;]/)[0].trim();
              let telefoneNumeros2 = primeiroTelefone2.replace(/\D/g, '');
              if (!telefoneNumeros2.startsWith('55')) {
                telefoneNumeros2 = '55' + telefoneNumeros2;
              }
              telefoneProcessado = telefoneNumeros2.substring(0, 13);
            }
          }
        } catch (_) {
          // Ignorar erros do fallback e prosseguir com os dados disponíveis
        }
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
        email,
      };
    } catch (error) {
      toast.error('Erro ao buscar CNPJ. Verifique se está correto.');
      setLoading(false);
      return null;
    }
  };

  return { lookupCNPJ, loading };
};
