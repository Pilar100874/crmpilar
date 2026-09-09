import { useCallback, useEffect, useRef, useState } from "react";
import { Move, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import BlocoCard from "@/components/automacao/BlocoCard";
import { Ambiente, Bloco, listarAmbientes, listarBlocos, moverBloco } from "@/lib/automacao/api";

const COLUNAS = 12;
const ALTURA_LINHA = 74;

export default function AutomacaoPainel() {
  const navigate = useNavigate();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [ambienteId, setAmbienteId] = useState<string>("");
  const [edicao, setEdicao] = useState(false);
  const [estados, setEstados] = useState<Record<string, boolean | null>>({});
  const gradeRef = useRef<HTMLDivElement | null>(null);
  const arrasto = useRef<{ id: string; ox: number; oy: number; bx: number; by: number } | null>(null);

  const carregar = useCallback(async () => {
    const [a, b] = await Promise.all([listarAmbientes(), listarBlocos()]);
    setAmbientes(a);
    setBlocos(b);
    setAmbienteId((atual) => atual || a[0]?.id || "");
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const doAmbiente = blocos.filter((b) => b.ambiente_id === ambienteId);

  const celula = () => {
    const largura = gradeRef.current?.clientWidth ?? 1;
    return { cx: largura / COLUNAS, cy: ALTURA_LINHA };
  };

  const aoArrastar = (e: React.PointerEvent, bloco: Bloco) => {
    if (!edicao) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    arrasto.current = { id: bloco.id, ox: e.clientX, oy: e.clientY, bx: bloco.x, by: bloco.y };
  };

  const aoMover = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const { cx, cy } = celula();
    const bloco = blocos.find((b) => b.id === a.id);
    if (!bloco) return;
    const nx = Math.max(0, Math.min(COLUNAS - bloco.w, a.bx + Math.round((e.clientX - a.ox) / cx)));
    const ny = Math.max(0, a.by + Math.round((e.clientY - a.oy) / cy));
    if (nx !== bloco.x || ny !== bloco.y) {
      setBlocos((ant) => ant.map((b) => (b.id === a.id ? { ...b, x: nx, y: ny } : b)));
    }
  };

  const aoSoltar = async () => {
    const a = arrasto.current;
    arrasto.current = null;
    if (!a) return;
    const bloco = blocos.find((b) => b.id === a.id);
    if (bloco) await moverBloco(bloco.id, { x: bloco.x, y: bloco.y, w: bloco.w, h: bloco.h });
  };

  if (!ambientes.length) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="text-muted-foreground mb-4">Você ainda não criou nenhum ambiente.</p>
        <Button onClick={() => navigate("/automacao/configuracoes")}>
          <Plus className="h-4 w-4 mr-2" /> Criar meu primeiro ambiente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={ambienteId} onValueChange={setAmbienteId} className="min-w-0">
          <TabsList className="flex-wrap h-auto">
            {ambientes.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>{a.nome}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          <Button variant={edicao ? "default" : "outline"} size="sm" onClick={() => setEdicao((v) => !v)}>
            {edicao ? <><Check className="h-4 w-4 mr-2" /> Concluir</> : <><Move className="h-4 w-4 mr-2" /> Organizar</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/automacao/configuracoes")}>
            <Plus className="h-4 w-4 mr-2" /> Novo bloco
          </Button>
        </div>
      </div>

      <div
        ref={gradeRef}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        className="relative rounded-2xl border bg-muted/20 p-2 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))`,
          gridAutoRows: `${ALTURA_LINHA}px`,
          minHeight: 320,
        }}
      >
        {doAmbiente.map((b) => (
          <div
            key={b.id}
            onPointerDown={(e) => aoArrastar(e, b)}
            style={{
              gridColumn: `${b.x + 1} / span ${b.w}`,
              gridRow: `${b.y + 1} / span ${b.h}`,
              cursor: edicao ? "grab" : undefined,
              touchAction: edicao ? "none" : undefined,
            }}
          >
            <BlocoCard
              bloco={b}
              ligado={estados[b.id] ?? null}
              edicao={edicao}
              onEditar={() => navigate("/automacao/configuracoes")}
              onEstado={(v) => setEstados((s) => ({ ...s, [b.id]: v }))}
            />
          </div>
        ))}
        {!doAmbiente.length && (
          <div className="col-span-full flex items-center justify-center text-sm text-muted-foreground py-16">
            Nenhum bloco neste ambiente ainda.
          </div>
        )}
      </div>

      {edicao && (
        <p className="text-xs text-muted-foreground">
          Arraste os blocos para reposicionar. A posição é salva automaticamente.
        </p>
      )}
    </div>
  );
}
