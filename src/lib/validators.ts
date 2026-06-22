// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

// Validação de CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Validação de Email (RFC 5322 simplificada + verificações extras)
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmedEmail = email.trim();
  
  // Verificações básicas de formato
  if (trimmedEmail.length === 0) return false;
  if (trimmedEmail.length > 254) return false; // RFC 5321
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) return false;
  if (trimmedEmail.includes('..')) return false; // Pontos consecutivos não são permitidos
  
  // Regex mais rigorosa baseada em RFC 5322
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmedEmail)) return false;
  
  // Verificar se tem @ e apenas um @
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  
  // Dividir em local part e domain
  const [localPart, domain] = trimmedEmail.split('@');
  
  // Verificar tamanhos
  if (localPart.length === 0 || localPart.length > 64) return false; // RFC 5321
  if (domain.length === 0 || domain.length > 253) return false;
  
  // Verificar se o domínio tem pelo menos um ponto
  if (!domain.includes('.')) return false;
  
  // Verificar se o domínio não termina ou começa com hífen
  const domainParts = domain.split('.');
  for (const part of domainParts) {
    if (part.length === 0) return false;
    if (part.startsWith('-') || part.endsWith('-')) return false;
  }
  
  return true;
};

// Validação de Telefone/WhatsApp (formato brasileiro com código do país)
export const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Aceita com ou sem código do país (55)
  // Com código: 5511999999999 (13 dígitos)
  // Sem código: 11999999999 (10 ou 11 dígitos)
  if (cleanPhone.startsWith('55')) {
    return cleanPhone.length === 12 || cleanPhone.length === 13; // 55 + 10 ou 11 dígitos
  }
  
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

// Validação de WhatsApp (sempre deve ter código do país)
export const validateWhatsApp = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Deve começar com 55 (Brasil) e ter 13 dígitos no total
  // Formato: 55 + DDD (2 dígitos) + número (9 dígitos para celular)
  if (!cleanPhone.startsWith('55')) return false;
  
  return cleanPhone.length === 13; // 55 + 2 (DDD) + 9 (número celular com 9)
};

// Validação de Telefone por Formato
export const validatePhoneFormat = (phone: string, format: string): boolean => {
  const trimmed = phone.trim();
  switch (format) {
    case "international": {
      // +NN (NN) NNNN-NNNNN ou NN (NN) NNNN-NNNNN (aceita também NNNN-NNNN)
      const internationalRegex = /^(\+\d{2}|\d{2})\s?\(\d{2}\)\s?\d{4}-\d{4,5}$/;
      return internationalRegex.test(trimmed);
    }
    case "national": {
      // (NN) NNNN-NNNNN ou (NN) NNNN-NNNN
      const nationalRegex = /^\(\d{2}\)\s?\d{4}-\d{4,5}$/;
      return nationalRegex.test(trimmed);
    }
    case "any":
    default:
      return true;
  }
};

// Validação de CEP
export const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

// Validação de Inscrição Estadual (básica)
export const validateInscricaoEstadual = (ie: string): boolean => {
  const cleanIE = ie.replace(/\D/g, '');
  return cleanIE.length >= 9 && cleanIE.length <= 14;
};

// Validação de PIS/PASEP/NIT (algoritmo módulo 11)
export const validatePIS = (pis: string): boolean => {
  const c = pis.replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i], 10) * weights[i];
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === parseInt(c[10], 10);
};

// IPv4 simples
export const validateIP = (ip: string): boolean => {
  if (!ip) return false;
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && parseInt(p, 10) <= 255);
};
