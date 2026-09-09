import { useCallback, useEffect, useState } from "react";
import { UserPlus, Truck, Car, AlertTriangle, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bloco } from "@/lib/automacao/api";

export type ModuloPortaria = "visitantes" | "transportadoras" | "veiculos" | "ocorrencias" | "encomendas";

export const MODULOS_PORTARIA: {
  valor: ModuloPortaria;
  label: string;
  descricao: string;
  rota: string;
}[] = [
  { valor: "visitantes", label: "Visitantes", descricao: "Visitantes dentro do local agora", rota: "/portaria/visitantes" },
  { valor: "transportadoras", label: "Transportadoras", descricao: "Caminhões que entraram e ainda não saíram", rota: "/transportadoras/movimentos" },
  { valor: "veiculos", label: "Veículos internos", descricao: "Veículos da empresa que estão na rua", rota: "/controle-veiculos/movimentos" },
  { valor: "ocorrencias", label: "Ocorrências", descricao: "Registros do livro de ocorrências em aberto", rota: "/livro-ocorrencia/ocorrencias" },
  { valor: "encomendas", label: "Encomendas", descricao: "Encomendas recebidas aguardando retirada", rota: "/livro-ocorrencia/encomendas" },
];

const ICONES = {
  visitantes: UserPlus,
  transportadoras: Truck,
  veiculos: Car,
  ocorrencias: AlertTriangle,
  encomendas: Package,
} as const;

interface Item {
  titulo: string;
  detalhe: string;
}

const db = supabase as unknown as { from: (t: string) => any };

const porUnidade = (q: any, unidadeId?: string | null) => (unidadeId ? q.eq("unidade_id", unidadeId) : q);

async function carregarModulo(
  modulo: ModuloPortaria,
  unidadeId?: string | null,
  limite = 4,
): Promise<{ total: number; itens: Item[] }> {
  if (modulo === "visitantes") {
    const { data, count } = await porUnidade(
      db
        .from("port_visitors")
        .select("id, nome, documento, created_at", { count: "exact" })
        .eq("status", "ativo"),
      unidadeId,
    )
      .order("created_at", { ascending: false })
      .limit(limite);
    return {
      total: count ?? (data?.length ?? 0),
      itens: (data ?? []).map((v: any) => ({ titulo: v.nome ?? "Visitante", detalhe: v.documento ?? "" })),
    };
  }
  if (modulo === "transportadoras") {
    const { data, count } = await porUnidade(
      db
        .from("transp_movimentos")
        .select("id, placa, motorista_nome, motivo, entrada_time", { count: "exact" })
        .neq("status", "saiu"),
      unidadeId,
    )
      .order("entrada_time", { ascending: false })
      .limit(limite);
    return {
      total: count ?? (data?.length ?? 0),
      itens: (data ?? []).map((m: any) => ({
        titulo: m.placa ?? "Veículo",
        detalhe: m.motorista_nome ?? m.motivo ?? "",
      })),
    };
  }
  if (modulo === "veiculos") {
    const { data, count } = await porUnidade(
      db
        .from("cv_vehicle_movements")
        .select("id, exit_time, vehicle:cv_vehicles(plate, name)", { count: "exact" })
        .eq("status", "out"),
      unidadeId,
    )
      .order("exit_time", { ascending: false })
      .limit(limite);
    return {
      total: count ?? (data?.length ?? 0),
      itens: (data ?? []).map((m: any) => ({
        titulo: m.vehicle?.plate ?? "Veículo",
        detalhe: m.vehicle?.name ?? "",
      })),
    };
  }
  if (modulo === "ocorrencias") {
    const { data, count } = await porUnidade(
      db
        .from("livro_ocorrencias")
        .select("id, tipo, gravidade, local, data_hora", { count: "exact" })
        .eq("status", "aberta"),
      unidadeId,
    )
      .order("data_hora", { ascending: false })
      .limit(limite);
    return {
      total: count ?? (data?.length ?? 0),
      itens: (data ?? []).map((o: any) => ({ titulo: o.tipo ?? "Ocorrência", detalhe: o.local ?? "" })),
    };
  }
  const { data, count } = await porUnidade(
    db
      .from("livro_encomendas")
      .select("id, destinatario, transportadora, data_recebimento", { count: "exact" })
      .is("data_entrega", null),
    unidadeId,
  )
    .order("data_recebimento", { ascending: false })
    .limit(limite);
  return {
    total: count ?? (data?.length ?? 0),
    itens: (data ?? []).map((e: any) => ({ titulo: e.destinatario ?? "Encomenda", detalhe: e.transportadora ?? "" })),
  };
}

/** Mostra no painel o resumo ao vivo de um controle da portaria. */
export default function BlocoPortaria({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as {
    modulo?: ModuloPortaria;
    intervalo_seg?: number;
    mostrar_lista?: boolean;
    unidade_id?: string | null;
    limite?: number;
  };
  const modulo: ModuloPortaria = cfg.modulo ?? "visitantes";
  const intervalo = Math.max(10, Number(cfg.intervalo_seg ?? 30));
  const mostrarLista = cfg.mostrar_lista !== false;
  const unidadeId = cfg.unidade_id ?? null;
  const limite = Math.min(20, Math.max(1, Number(cfg.limite ?? 4)));
  const info = MODULOS_PORTARIA.find((m) => m.valor === modulo)!;
  const Icon = ICONES[modulo];
  const [total, setTotal] = useState(0);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const r = await carregarModulo(modulo, unidadeId, limite);
      setTotal(r.total);
      setItens(r.itens);
    } finally {
      setCarregando(false);
    }
  }, [modulo, unidadeId, limite]);

  useEffect(() => {
    setCarregando(true);
    carregar();
    const t = setInterval(carregar, intervalo * 1000);
    return () => clearInterval(t);
  }, [carregar, intervalo]);

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-border bg-card p-3 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{bloco.nome || info.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{info.descricao}</p>
        </div>
        <span className="shrink-0 text-2xl font-bold tabular-nums">
          {carregando ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : total}
        </span>
      </div>

      {mostrarLista && (
        <div className="mt-2 space-y-1">
          {itens.length === 0 && !carregando ? (
            <p className="text-[11px] text-muted-foreground">Nada em aberto no momento.</p>
          ) : (
            itens.map((i, n) => (
              <div key={n} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                <span className="truncate text-xs font-medium">{i.titulo}</span>
                <span className="shrink-0 truncate text-[11px] text-muted-foreground">{i.detalhe}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
