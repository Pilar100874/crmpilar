// Serviço unificado de consulta de CEP (ViaCEP) com cache e dedup.
import { validateCEP } from "@/lib/validators";

export interface CepResultado {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const cache = new Map<string, Promise<CepResultado | null>>();

export function buscarCEP(cepRaw: string): Promise<CepResultado | null> {
  const cep = (cepRaw || "").replace(/\D/g, "");
  if (!validateCEP(cep)) return Promise.resolve(null);

  const cached = cache.get(cep);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) {
        setTimeout(() => cache.delete(cep), 15_000);
        return null;
      }
      const data = await res.json();
      if (data.erro) {
        setTimeout(() => cache.delete(cep), 15_000);
        return null;
      }
      return {
        cep: (data.cep || cep).replace(/\D/g, ""),
        logradouro: data.logradouro || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        uf: data.uf || "",
      } as CepResultado;
    } catch {
      cache.delete(cep);
      return null;
    }
  })();

  cache.set(cep, promise);
  return promise;
}

export function clearCepCache() { cache.clear(); }
