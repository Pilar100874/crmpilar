import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useCampainha, useInterfoneConfig, tocarAlerta, type ToqueCampainha } from "@/lib/portaria/interfone";
import { usePushInterfone, notificarCampainhaLocal } from "@/lib/portaria/push";
import InterfonePopup from "@/components/portaria/InterfonePopup";
import PilarFone from "@/components/portaria/PilarFone";
import { useAbasPermitidas } from "@/lib/portaria/abasPilarFone";

/** Tela do app Pilar Fone no celular: agenda de ramais, discador e interfone. */
export default function PortariaAtendimentoMobile({ dark = false }: { dark?: boolean }) {
  const { unidadeId } = useUnidadeAtual();
  const { config } = useInterfoneConfig(unidadeId);
  const { status, registrar } = usePushInterfone(unidadeId);
  const [toques, setToques] = useState<ToqueCampainha[]>([]);
  const [toqueId, setToqueId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      let q = supabase
        .from("port_campainha_eventos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (unidadeId) q = q.eq("unidade_id", unidadeId);
      const { data } = await q;
      if (ativo) setToques((data ?? []) as ToqueCampainha[]);
    })();
    return () => {
      ativo = false;
    };
  }, [unidadeId]);

  useCampainha(unidadeId, !!config?.ativo, (toque) => {
    setToques((atual) => [toque, ...atual].slice(0, 20));
    setToqueId(toque.id);
    setAberto(true);
    if (config?.som) tocarAlerta();
    void notificarCampainhaLocal("Campainha do interfone", "Alguém está na portaria. Toque para atender.");
  });

  return (
    <div className={dark ? "dark" : undefined}>
      <PilarFone
        onAbrirInterfone={() => {
          setToqueId(toques[0]?.id ?? null);
          setAberto(true);
        }}
        onAbrirToque={(id) => {
          setToqueId(id);
          setAberto(true);
        }}
        onAtivarAlertas={() => void registrar()}
        alertasAtivos={status === "ativo"}
        historico={toques.map((t) => ({ id: t.id, created_at: t.created_at, status: t.status }))}
      />

      {config && (
        <InterfonePopup
          aberto={aberto}
          onFechar={() => setAberto(false)}
          config={config}
          unidadeId={unidadeId}
          toqueId={toqueId}
        />
      )}
    </div>
  );
}
