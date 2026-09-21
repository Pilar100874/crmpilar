import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JANELA_PRESENCA_MS, type OrigemPresenca } from "@/lib/telefonia/presencaSip";

export interface RamalTelefonista {
  ramal: string;
  nome?: string;
  /** Registrado no PABX (telefone físico, app ou Pilar Fone). */
  onlinePabx: boolean;
  endereco?: string;
  tipo?: string;
  /** Conectado pelo sistema (navegador ou aplicativo Pilar Fone). */
  noSistema: boolean;
  origens: OrigemPresenca[];
  emChamada: boolean;
}

export interface ChamadaAoVivo {
  canal?: string;
  origem?: string;
  destino?: string;
  duracao?: string;
  estado?: string;
}

export interface TroncoPainel {
  nome?: string;
  tipo?: string;
  status?: string;
}

export interface AgenteFila {
  ramal: string;
  nome?: string;
  pausado: boolean;
  status?: string;
}

export interface FilaPainel {
  numero: string;
  nome?: string;
  estrategia?: string;
  agentes: AgenteFila[];
}

interface RespostaPainel {
  ok?: boolean;
  error?: string;
  ramais?: Array<{ ramal: string; nome?: string; online?: boolean; endereco?: string; tipo?: string }>;
  chamadas?: ChamadaAoVivo[];
  troncos?: TroncoPainel[];
  troncos_disponiveis?: boolean;
  filas?: FilaPainel[];
  meu_ramal?: string;
}

/**
 * Painel da mesa de telefonista: junta o estado do PABX (ramais, chamadas ao
 * vivo, filas e linhas) com a presença dos ramais conectados pelo sistema.
 * Atualiza sozinho no intervalo informado (padrão: 10s).
 */
export function usePainelTelefonista(intervaloMs = 10000) {
  const [ramais, setRamais] = useState<RamalTelefonista[]>([]);
  const [chamadas, setChamadas] = useState<ChamadaAoVivo[]>([]);
  const [troncos, setTroncos] = useState<TroncoPainel[]>([]);
  const [troncosDisponiveis, setTroncosDisponiveis] = useState(true);
  const [filas, setFilas] = useState<FilaPainel[]>([]);
  const [meuRamal, setMeuRamal] = useState("");
  const [pabxDisponivel, setPabxDisponivel] = useState<boolean | null>(null);
  const [motivoPabx, setMotivoPabx] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const emAndamento = useRef(false);
  // Sessão expirada (401): para de chamar até o usuário entrar de novo.
  const bloqueadoPor401 = useRef(false);

  const atualizar = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    try {
      const desde = new Date(Date.now() - JANELA_PRESENCA_MS).toISOString();
      const { data: sessao } = await supabase.auth.getSession();
      const logado = Boolean(sessao?.session?.access_token) && !bloqueadoPor401.current;
      const [presencaResp, painelResp] = await Promise.all([
        supabase
          .from("sip_presenca")
          .select("ramal, origem, em_chamada, ultimo_ping")
          .gte("ultimo_ping", desde),
        logado
          ? supabase.functions.invoke("ucm-telefonista", { body: { acao: "painel" } }).catch((erro) => {
              const status = (erro as { context?: { status?: number } })?.context?.status;
              if (status === 401) bloqueadoPor401.current = true;
              return { data: null };
            })
          : Promise.resolve({ data: null }),
      ]);

      const mapa = new Map<string, RamalTelefonista>();
      for (const linha of presencaResp.data ?? []) {
        const ramal = String((linha as { ramal: string }).ramal);
        const atual = mapa.get(ramal) ?? {
          ramal,
          onlinePabx: false,
          noSistema: false,
          origens: [],
          emChamada: false,
        };
        atual.noSistema = true;
        const origem = (linha as { origem: OrigemPresenca }).origem;
        if (!atual.origens.includes(origem)) atual.origens.push(origem);
        atual.emChamada = atual.emChamada || Boolean((linha as { em_chamada: boolean }).em_chamada);
        mapa.set(ramal, atual);
      }

      const painel = (painelResp as { data?: RespostaPainel | null })?.data ?? null;
      if (painel?.ok) {
        setPabxDisponivel(true);
        setMotivoPabx(null);
        setChamadas(painel.chamadas ?? []);
        setTroncos(painel.troncos ?? []);
        setTroncosDisponiveis(painel.troncos_disponiveis !== false);
        setFilas(Array.isArray(painel.filas) ? painel.filas : []);
        setMeuRamal(String(painel.meu_ramal ?? ""));
        for (const item of painel.ramais ?? []) {
          const ramal = String(item.ramal);
          if (!ramal) continue;
          const atual = mapa.get(ramal) ?? {
            ramal,
            onlinePabx: false,
            noSistema: false,
            origens: [],
            emChamada: false,
          };
          atual.nome = atual.nome ?? item.nome;
          atual.onlinePabx = Boolean(item.online);
          atual.endereco = item.endereco;
          atual.tipo = item.tipo;
          mapa.set(ramal, atual);
        }
      } else {
        setPabxDisponivel(false);
        setMotivoPabx(painel?.error ?? "PABX não respondeu");
        setChamadas([]);
        setTroncos([]);
        setFilas([]);
      }

      setRamais(
        [...mapa.values()].sort((a, b) => a.ramal.localeCompare(b.ramal, "pt-BR", { numeric: true })),
      );
    } finally {
      emAndamento.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void atualizar();
    const t = setInterval(() => void atualizar(), intervaloMs);
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED") bloqueadoPor401.current = false;
    });
    return () => {
      clearInterval(t);
      sub.subscription.unsubscribe();
    };
  }, [atualizar, intervaloMs]);

  return {
    ramais,
    chamadas,
    troncos,
    troncosDisponiveis,
    filas,
    meuRamal,
    pabxDisponivel,
    motivoPabx,
    carregando,
    atualizar,
  };
}
