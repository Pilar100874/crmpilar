import { useCallback, useEffect, useRef, useState } from "react";
import { Move, Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import BlocoCard from "@/components/automacao/BlocoCard";
import BlocoEditorDialog from "@/components/automacao/BlocoEditorDialog";
import AmbienteDialog from "@/components/automacao/AmbienteDialog";
import {
  Ambiente, Bloco, CameraSimples, DispositivoSimples,
  excluirAmbiente, excluirBloco, listarAmbientes, listarBlocos,
  listarCameras, listarDispositivos, moverBloco,
} from "@/lib/automacao/api";
import { supabase } from "@/integrations/supabase/client";
import { isAdministradorSistema } from "@/lib/portaria/porteiros";

const COLUNAS = 12;
const ALTURA_LINHA = 74;

export default function AutomacaoPainel() {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoSimples[]>([]);
  const [cameras, setCameras] = useState<CameraSimples[]>([]);
  const [ambienteId, setAmbienteId] = useState<string>("");
  const [edicao, setEdicao] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [estados, setEstados] = useState<Record<string, boolean | null>>({});
  const [blocoEdit, setBlocoEdit] = useState<Partial<Bloco> | null>(null);
  const [ambienteEdit, setAmbienteEdit] = useState<Partial<Ambiente> | null>(null);
  const [excluir, setExcluir] = useState<{ tipo: "ambiente" | "bloco"; id: string; nome: string } | null>(null);
  const gradeRef = useRef<HTMLDivElement | null>(null);
  const arrasto = useRef<{ id: string; ox: number; oy: number; bx: number; by: number } | null>(null);
  const redim = useRef<{ id: string; ox: number; oy: number; bw: number; bh: number } | null>(null);


  const carregar = useCallback(async () => {
    const [a, b, d, c] = await Promise.all([listarAmbientes(), listarBlocos(), listarDispositivos(), listarCameras()]);
    setAmbientes(a);
    setBlocos(b);
    setDispositivos(d);
    setCameras(c);
    setAmbienteId((atual) => (a.some((x) => x.id === atual) ? atual : a[0]?.id || ""));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", uid).maybeSingle();
      setAdmin(await isAdministradorSistema(uid, (u as any)?.id ?? null));
    })();
  }, []);

  const podeEditar = admin && edicao;
  const doAmbiente = blocos.filter((b) => b.ambiente_id === ambienteId);

  const celula = () => {
    const largura = gradeRef.current?.clientWidth ?? 1;
    return { cx: largura / COLUNAS, cy: ALTURA_LINHA };
  };

  const aoArrastar = (e: React.PointerEvent, bloco: Bloco) => {
    if (!podeEditar) return;
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

  const novoBloco = () =>
    setBlocoEdit({ nome: "", tipo: "luz", ambiente_id: ambienteId || ambientes[0]?.id, canal: 0, x: 0, y: 0, w: 3, h: 2 });

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (excluir.tipo === "ambiente") await excluirAmbiente(excluir.id);
    else await excluirBloco(excluir.id);
    setExcluir(null);
    toast.success("Excluído.");
    carregar();
  };

  if (!ambientes.length) {
    return (
      <>
        <div className="rounded-lg border bg-card p-10 text-center">
          <p className="text-muted-foreground mb-4">Você ainda não criou nenhum ambiente.</p>
          {admin ? (
            <Button onClick={() => setAmbienteEdit({ nome: "", ordem: 0 })}>
              <Plus className="h-4 w-4 mr-2" /> Criar meu primeiro ambiente
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Peça a um administrador para montar o painel.</p>
          )}
        </div>
        <AmbienteDialog ambiente={ambienteEdit} onChange={setAmbienteEdit} onSalvo={carregar} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={ambienteId} onValueChange={setAmbienteId} className="min-w-0">
          <TabsList className="flex-wrap h-auto">
            {ambientes.map((a) => (
              <TabsTrigger key={a.id} value={a.id} className="gap-1">
                {a.nome}
                {podeEditar && (
                  <>
                    <Pencil
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setAmbienteEdit(a); }}
                    />
                    <Trash2
                      className="h-3 w-3 text-destructive opacity-70 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setExcluir({ tipo: "ambiente", id: a.id, nome: a.nome }); }}
                    />
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {podeEditar && (
          <Button size="sm" variant="ghost" onClick={() => setAmbienteEdit({ nome: "", ordem: ambientes.length })}>
            <Plus className="h-4 w-4 mr-1" /> Ambiente
          </Button>
        )}
        {admin && (
          <div className="ml-auto flex gap-2">
            <Button variant={edicao ? "default" : "outline"} size="sm" onClick={() => setEdicao((v) => !v)}>
              {edicao ? <><Check className="h-4 w-4 mr-2" /> Concluir</> : <><Move className="h-4 w-4 mr-2" /> Editar painel</>}
            </Button>
            {edicao && (
              <Button size="sm" onClick={novoBloco}>
                <Plus className="h-4 w-4 mr-2" /> Novo elemento
              </Button>
            )}
          </div>
        )}
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
            className="relative"
            style={{
              gridColumn: `${b.x + 1} / span ${b.w}`,
              gridRow: `${b.y + 1} / span ${b.h}`,
              cursor: podeEditar ? "grab" : undefined,
              touchAction: podeEditar ? "none" : undefined,
            }}
          >
            <BlocoCard
              bloco={b}
              ligado={estados[b.id] ?? null}
              edicao={podeEditar}
              onEditar={() => setBlocoEdit(b)}
              onEstado={(v) => setEstados((s) => ({ ...s, [b.id]: v }))}
            />
            {podeEditar && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setExcluir({ tipo: "bloco", id: b.id, nome: b.nome })}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {!doAmbiente.length && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground py-16">
            Nenhum elemento neste ambiente ainda.
            {podeEditar && (
              <Button size="sm" onClick={novoBloco}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar elemento
              </Button>
            )}
          </div>
        )}
      </div>

      {podeEditar && (
        <p className="text-xs text-muted-foreground">
          Arraste os elementos para reposicionar. A posição é salva automaticamente.
        </p>
      )}

      <BlocoEditorDialog
        bloco={blocoEdit}
        ambientes={ambientes}
        dispositivos={dispositivos}
        cameras={cameras}
        onChange={setBlocoEdit}
        onSalvo={carregar}
      />
      <AmbienteDialog ambiente={ambienteEdit} onChange={setAmbienteEdit} onSalvo={carregar} />
      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
