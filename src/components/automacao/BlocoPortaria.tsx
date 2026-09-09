import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Truck, Car, AlertTriangle, Package, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bloco } from "@/lib/automacao/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface Props {
  bloco: Bloco;
  edicao?: boolean;
  onAcionar?: () => void;
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
export default function BlocoPortaria({ bloco, edicao, onAcionar }: Props) {
  const cfg = (bloco.config ?? {}) as {
    modulo?: ModuloPortaria;
    intervalo_seg?: number;
    mostrar_lista?: boolean;
    unidade_id?: string | null;
    limite?: number;
    cor_fundo?: string;
    cor_texto?: string;
    cor_secundaria?: string;
    cor_destaque?: string;
    tamanho_titulo?: number;
    tamanho_texto?: number;
    tamanho_numero?: number;
  };
  const modulo: ModuloPortaria = cfg.modulo ?? "visitantes";
  const intervalo = Math.max(10, Number(cfg.intervalo_seg ?? 30));
  const mostrarLista = cfg.mostrar_lista !== false;
  const unidadeId = cfg.unidade_id ?? null;
  const limite = Math.min(20, Math.max(1, Number(cfg.limite ?? 4)));
  const transparente = (cfg as { transparente?: boolean }).transparente === true;
  const corFundo = cfg.cor_fundo || undefined;
  const corTexto = cfg.cor_texto || undefined;
  const corSecundaria = cfg.cor_secundaria || undefined;
  const corDestaque = cfg.cor_destaque || undefined;
  const tamTitulo = Math.min(48, Math.max(10, Number(cfg.tamanho_titulo ?? 14)));
  const tamTexto = Math.min(40, Math.max(9, Number(cfg.tamanho_texto ?? 12)));
  const tamNumero = Math.min(96, Math.max(14, Number(cfg.tamanho_numero ?? 24)));
  const info = MODULOS_PORTARIA.find((m) => m.valor === modulo)!;
  const Icon = ICONES[modulo];
  const [total, setTotal] = useState(0);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ampliado, setAmpliado] = useState(false);

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

  const alternar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edicao) return;
    setAmpliado((v) => !v);
    onAcionar?.();
  };

  const conteudo = (
    <div
      className={`h-full w-full overflow-hidden rounded-2xl p-3 text-left flex flex-col ${
        transparente ? "border border-transparent bg-transparent" : "border border-border bg-card"
      }`}
      style={{
        backgroundColor: transparente ? "transparent" : corFundo,
        color: corTexto,
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 select-none",
          !edicao && "cursor-pointer hover:opacity-90 transition-opacity"
        )}
        onClick={alternar}
        title="Toque para ampliar"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
          style={corDestaque ? { backgroundColor: `${corDestaque}26`, color: corDestaque } : undefined}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" style={{ fontSize: tamTitulo }}>
            {bloco.nome || info.label}
          </p>
          <p
            className="truncate text-muted-foreground"
            style={{ fontSize: Math.max(9, tamTexto - 1), color: corSecundaria }}
          >
            {info.descricao}
          </p>
        </div>
        <span
          className="flex items-center gap-2 shrink-0 font-bold tabular-nums"
          style={{ fontSize: tamNumero, color: corDestaque ?? corTexto }}
        >
          {carregando ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : total}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); setAmpliado((v) => !v); onAcionar?.(); }}
            title={ampliado ? "Reduzir" : "Ampliar"}
          >
            {ampliado ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </span>
      </div>

      {mostrarLista && (
        <div className="mt-2 space-y-1 overflow-auto">
          {itens.length === 0 && !carregando ? (
            <p
              className="text-muted-foreground"
              style={{ fontSize: Math.max(9, tamTexto - 1), color: corSecundaria }}
            >
              Nada em aberto no momento.
            </p>
          ) : (
            itens.map((i, n) => (
              <div
                key={n}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1"
                style={corFundo ? { backgroundColor: "rgba(128,128,128,0.18)" } : undefined}
              >
                <span className="truncate font-medium" style={{ fontSize: tamTexto }}>
                  {i.titulo}
                </span>
                <span
                  className="shrink-0 truncate text-muted-foreground"
                  style={{ fontSize: Math.max(9, tamTexto - 1), color: corSecundaria }}
                >
                  {i.detalhe}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (!ampliado) return conteudo;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 p-4 sm:p-8 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) { e.stopPropagation(); setAmpliado(false); onAcionar?.(); } }}
    >
      <div className="relative w-full max-w-5xl h-full max-h-[90vh]">
        {conteudo}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/70 text-white hover:bg-black/90"
          onClick={(e) => { e.stopPropagation(); setAmpliado(false); onAcionar?.(); }}
          title="Voltar ao painel"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>
    </div>,
    document.body
  );
}
