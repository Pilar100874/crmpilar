/** Configuração do ramal SIP guardada neste aparelho. */
export const SIP_STORAGE_KEY = "portaria.sip.config";

export interface PortariaSipConfig {
  servidor: string;
  servidorRemoto: string;
  porta: string;
  portaRemota: string;
  ramal: string;
  /** Usuário de autenticação SIP, quando o PABX usa um nome diferente do número do ramal. */
  usuarioSip: string;
  senha: string;
  nome: string;
  ramalPortaria: string;
  autoConectar: boolean;
  autoAtender: boolean;
}

export const CONFIG_SIP_PADRAO: PortariaSipConfig = {
  servidor: "",
  servidorRemoto: "",
  porta: "8089",
  portaRemota: "8089",
  ramal: "",
  senha: "",
  nome: "",
  ramalPortaria: "",
  autoConectar: true,
  autoAtender: false,
};

export function lerConfigSip(): PortariaSipConfig {
  try {
    const bruto = localStorage.getItem(SIP_STORAGE_KEY);
    if (!bruto) return CONFIG_SIP_PADRAO;
    return { ...CONFIG_SIP_PADRAO, ...(JSON.parse(bruto) as Partial<PortariaSipConfig>) };
  } catch {
    return CONFIG_SIP_PADRAO;
  }
}

export function salvarConfigSip(config: PortariaSipConfig) {
  localStorage.setItem(SIP_STORAGE_KEY, JSON.stringify(config));
}
