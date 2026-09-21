import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JANELA_PRESENCA_MS, type OrigemPresenca } from "@/lib/telefonia/presencaSip";

export interface StatusRamal {
  ramal: string;
  nome?: string;
  /** Conectado pelo sistema (navegador ou aplicativo Pilar Fone). */
  noSistema: boolean;
  origens: OrigemPresenca[];
  /** Registrado no PABX por um aparelho SIP físico (fora do sistema). */
  noAparelho: boolean;
  registradoPabx: boolean;
  emChamada: boolean;
  enderecoPabx?: string;
}

export interface ChamadaPabx {
  canal?: string;
  origem?: string;
  destino?: string;
  duracao?: string;
  estado?: string;
}

export interface TroncoPabx {
  nome?: string;
  tipo?: string;
  status?: string;
}

interface RespostaUcm {
  ok?: boolean;
  motivo?: string;
  ramais?: Array<{ ramal: string; nome?: string; online?: boolean; endereco?: string }>;
  chamadas?: ChamadaPabx[];
  troncos?: TroncoPabx[];
}

/**
 * Junta duas fontes: a presença dos ramais conectados pelo sistema (web/APK)
 * e o estado real do PABX (que enxerga também os telefones SIP físicos).
 */
export function useStatusRamais(intervaloMs = 30000) {
  const [statusPorRamal, setStatusPorRamal] = useState<Record<string, StatusRamal>>({});
  const [chamadas, setChamadas] = useState<ChamadaPabx[]>([]);
  const [troncos, setTroncos] = useState<TroncoPabx[]>([]);
  const [pabxDisponivel, setPabxDisponivel] = useState<boolean | null>(null);
  const [motivoPabx, setMotivoPabx] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const emAndamento = useRef(false);
  // Quando a função responde 401 ("Não autenticado"), a sessão expirou:
  // paramos de chamar até o usuário entrar de novo (evento de auth).
  const bloqueadoPor401 = useRef(false);

  const atualizar = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    try {
      const desde = new Date(Date.now() - JANELA_PRESENCA_MS).toISOString();
      // Sem sessão válida não adianta chamar a função: ela responderia 401
      // ("Não autenticado") a cada ciclo de polling.
      const { data: sessao } = await supabase.auth.getSession();
      const logado = Boolean(sessao?.session?.access_token) && !bloqueadoPor401.current;
      const [presencaResp, ucmResp] = await Promise.all([
        supabase
          .from("sip_presenca")
          .select("ramal, origem, em_chamada, ultimo_ping")
          .gte("ultimo_ping", desde),
        logado
          ? supabase.functions.invoke("ucm-status").catch((erro) => {
              const status = (erro as { context?: { status?: number } })?.context?.status;
              if (status === 401) bloqueadoPor401.current = true;
              return { data: null, error: true };
            })
          : Promise.resolve({ data: null, error: true }),
      ]);

      const mapa: Record<string, StatusRamal> = {};
      for (const linha of presencaResp.data ?? []) {
        const ramal = String((linha as { ramal: string }).ramal);
        const origem = (linha as { origem: OrigemPresenca }).origem;
        const atual = mapa[ramal] ?? {
          ramal,
          noSistema: false,
          origens: [],
          noAparelho: false,
          registradoPabx: false,
          emChamada: false,
        };
        atual.noSistema = true;
        if (!atual.origens.includes(origem)) atual.origens.push(origem);
        atual.emChamada = atual.emChamada || Boolean((linha as { em_chamada: boolean }).em_chamada);
        mapa[ramal] = atual;
      }

      const ucm = ((ucmResp as { data?: RespostaUcm | null })?.data ?? null) as RespostaUcm | null;
      if (ucm?.ok) {
        setPabxDisponivel(true);
        setMotivoPabx(null);
        setChamadas(ucm.chamadas ?? []);
        setTroncos(ucm.troncos ?? []);
        for (const item of ucm.ramais ?? []) {
          const ramal = String(item.ramal);
          const atual = mapa[ramal] ?? {
            ramal,
            noSistema: false,
            origens: [],
            noAparelho: false,
            registradoPabx: false,
            emChamada: false,
          };
          atual.nome = atual.nome ?? item.nome;
          atual.registradoPabx = Boolean(item.online);
          atual.enderecoPabx = item.endereco;
          // Registrado no PABX sem presença do sistema = telefone SIP físico.
          atual.noAparelho = Boolean(item.online) && !atual.noSistema;
          mapa[ramal] = atual;
        }
      } else {
        setPabxDisponivel(false);
        setMotivoPabx(ucm?.motivo ?? "PABX não respondeu");
        setChamadas([]);
        setTroncos([]);
      }

      setStatusPorRamal(mapa);
    } finally {
      emAndamento.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void atualizar();
    const t = setInterval(() => void atualizar(), intervaloMs);
    // Login ou renovação de token libera as chamadas de novo.
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED") {
        bloqueadoPor401.current = false;
      }
    });
    return () => {
      clearInterval(t);
      sub.subscription.unsubscribe();
    };
  }, [atualizar, intervaloMs]);

  const ramaisOnline = useMemo(
    () => Object.values(statusPorRamal).filter((r) => r.noSistema || r.registradoPabx),
    [statusPorRamal],
  );

  return { statusPorRamal, ramaisOnline, chamadas, troncos, pabxDisponivel, motivoPabx, carregando, atualizar };
}
