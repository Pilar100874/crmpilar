// Presets de APN das principais operadoras brasileiras para configuração
// automática de rastreadores GPS via SMS.
// Ao selecionar a operadora, os campos APN / usuário / senha são preenchidos
// automaticamente — sem digitação manual.

export interface OperadoraApnPreset {
  id: string;
  nome: string;
  apn: string;
  apn_user: string;
  apn_password: string;
}

export const OPERADORAS_APN: OperadoraApnPreset[] = [
  { id: 'vivo',       nome: 'Vivo',       apn: 'zap.vivo.com.br',    apn_user: 'vivo',      apn_password: 'vivo' },
  { id: 'claro',      nome: 'Claro',      apn: 'claro.com.br',       apn_user: 'claro',     apn_password: 'claro' },
  { id: 'tim',        nome: 'TIM',        apn: 'timbrasil.br',       apn_user: 'tim',       apn_password: 'tim' },
  { id: 'oi',         nome: 'Oi',         apn: 'gprs.oi.com.br',     apn_user: 'oi',        apn_password: 'oi' },
  { id: 'algar',      nome: 'Algar (CTBC)', apn: 'ctbc.br',          apn_user: 'ctbc',      apn_password: 'ctbc' },
  { id: 'sercomtel',  nome: 'Sercomtel',  apn: 'sercomtel.com.br',   apn_user: '',          apn_password: '' },
  { id: 'nextel',     nome: 'Nextel',     apn: 'nextel.com.br',      apn_user: 'nextel',    apn_password: 'nextel' },
  { id: 'arqia',      nome: 'Arqia (M2M)', apn: 'arqia.br',          apn_user: '',          apn_password: '' },
  { id: 'links',      nome: 'Links Field (M2M)', apn: 'iot.linksfield.net', apn_user: '',    apn_password: '' },
  { id: 'transmit',   nome: 'Transmit (M2M)', apn: 'virtueyes.com.br', apn_user: '',        apn_password: '' },
];

export function findOperadoraByApn(apn?: string | null): OperadoraApnPreset | undefined {
  if (!apn) return undefined;
  const a = apn.trim().toLowerCase();
  return OPERADORAS_APN.find(o => o.apn.toLowerCase() === a);
}
