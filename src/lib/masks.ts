// Aplicar máscara de CPF
export const maskCPF = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 11);
  
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return cleanValue.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  if (cleanValue.length <= 9) return cleanValue.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  return cleanValue.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
};

// Aplicar máscara de CNPJ
export const maskCNPJ = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 14);
  
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 5) return cleanValue.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  if (cleanValue.length <= 8) return cleanValue.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  if (cleanValue.length <= 12) return cleanValue.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  return cleanValue.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
};

// Aplicar máscara de CEP
export const maskCEP = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 8);
  
  if (cleanValue.length <= 5) return cleanValue;
  return cleanValue.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
};

// Aplicar máscara de Telefone
export const maskPhone = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 11);
  
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 6) return cleanValue.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (cleanValue.length <= 10) return cleanValue.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return cleanValue.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

// Aplicar máscara de WhatsApp com código do país
export const maskWhatsApp = (value: string): string => {
  // Remove tudo que não é número
  let cleanValue = value.replace(/\D/g, '');
  
  // Se não começa com 55, adiciona
  if (!cleanValue.startsWith('55') && cleanValue.length > 0) {
    cleanValue = '55' + cleanValue;
  }
  
  // Limita a 13 dígitos (55 + 11 dígitos)
  cleanValue = cleanValue.substring(0, 13);
  
  // Aplica a máscara: +55 (XX) XXXXX-XXXX
  if (cleanValue.length <= 2) return cleanValue ? `+${cleanValue}` : '';
  if (cleanValue.length <= 4) return cleanValue.replace(/^(\d{2})(\d{0,2})/, '+$1 ($2');
  if (cleanValue.length <= 9) return cleanValue.replace(/^(\d{2})(\d{2})(\d{0,5})/, '+$1 ($2) $3');
  if (cleanValue.length <= 13) {
    return cleanValue.replace(/^(\d{2})(\d{2})(\d{5})(\d{0,4})/, '+$1 ($2) $3-$4');
  }
  return cleanValue.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
};

// Aplicar máscara de Data
export const maskDate = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 8);
  
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 4) return cleanValue.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
  return cleanValue.replace(/^(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
};

// Aplicar máscara customizada
export const applyCustomMask = (value: string, mask: string): string => {
  let maskedValue = '';
  let valueIndex = 0;
  const cleanValue = value.replace(/\D/g, '');
  
  for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
    if (mask[i] === 'N' || mask[i] === 'X') {
      maskedValue += cleanValue[valueIndex];
      valueIndex++;
    } else {
      maskedValue += mask[i];
    }
  }
  
  return maskedValue;
};

// Remover máscara
export const removeMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Aplicar máscara de PIS/PASEP/NIT (XXX.XXXXX.XX-X)
export const maskPIS = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').substring(0, 11);
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 8) return cleanValue.replace(/^(\d{3})(\d{0,5})/, '$1.$2');
  if (cleanValue.length <= 10) return cleanValue.replace(/^(\d{3})(\d{5})(\d{0,2})/, '$1.$2.$3');
  return cleanValue.replace(/^(\d{3})(\d{5})(\d{2})(\d{0,1})/, '$1.$2.$3-$4');
};

// Inscrição estadual (genérica) – apenas dígitos com até 14
export const maskIE = (value: string): string => value.replace(/\D/g, '').substring(0, 14);

