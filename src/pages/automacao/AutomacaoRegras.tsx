import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Play, Workflow } from "lucide-react";
import { toast } from "sonner";
import RegraEditorDialog from "@/components/automacao/RegraEditorDialog";
import {
  Ambiente, Bloco, DispositivoSimples, listarAmbientes, listarBlocos, listarDispositivos,
} from "@/lib/automacao/api";
import {
  ACOES, GATILHOS, Regra, excluirRegra, listarRegras, rodarRegras, salvarRegra,
} from "@/lib/automacao/workflow";

export default function AutomacaoRegras() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const idsPainel = useMemo(
    () => (params.get("ambiente") || "").split(",").map((s) => s.trim()).filter(Boolean),
    [params],
  );
  const nomePainel = params.get("nome") || "";

  const [regras, setRegras] = useState<Regra[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoSimples[]>([]);
  const [edit, setEdit] = useState<Partial<Regra> | null>(null);
  const [excluir, setExcluir] = useState<Regra | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const [r, a, b, d] = await Promise.all([listarRegras(), listarAmbientes(), listarBlocos(), listarDispositivos()]);
    setRegras(r);
    setAmbientes(a);
    setBlocos(b);
    setDispositivos(d);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  /** Só as automações deste painel (quando veio de um painel). */
  const regrasVisiveis = useMemo(
    () => (idsPainel.length ? regras.filter((r) => r.ambiente_id && idsPainel.includes(r.ambiente_id)) : regras),
    [regras, idsPainel],
  );
  const blocosVisiveis = useMemo(
    () => (idsPainel.length ? blocos.filter((b) => b.ambiente_id && idsPainel.includes(b.ambiente_id)) : blocos),
    [blocos, idsPainel],
  );
  const novaRegra = () =>
    setEdit({
      nome: "",
      ativo: true,
      combinador: "todas",
      ambiente_id: idsPainel[0] ?? null,
      gatilho: { tipo: "bloco_clicado" },
      condicoes: [],
      acoes: [],
    });

  const nomeBloco = (id?: string | null) => blocos.find((b) => b.id === id)?.nome || "qualquer elemento";
  const nomeDispositivo = (id?: string | null) => dispositivos.find((d) => d.id === id)?.nome || "equipamento";

  const resumoGatilho = (r: Regra) => {
    const base = GATILHOS.find((g) => g.valor === r.gatilho?.tipo)?.label ?? "Gatilho";
    if (r.gatilho?.bloco_id) return `${base}: ${nomeBloco(r.gatilho.bloco_id)}`;
    if (r.gatilho?.device_id) return `${base}: ${nomeDispositivo(r.gatilho.device_id)}`;
    return base;
  };

  const resumoAcoes = (r: Regra) =>
    r.acoes
      .map((a) => {
        const rotulo = ACOES.find((x) => x.valor === a.tipo)?.label ?? a.tipo;
        if (a.tipo === "esperar") return `${rotulo} (${a.segundos ?? 1}s)`;
        if (a.tipo === "mensagem") return `${rotulo}`;
        return `${rotulo} — ${a.alvo === "bloco" ? nomeBloco(a.bloco_id) : nomeDispositivo(a.device_id)}`;
      })
      .join(" · ") || "sem ações";

  const alternar = async (r: Regra) => {
    setRegras((ant) => ant.map((x) => (x.id === r.id ? { ...x, ativo: !x.ativo } : x)));
    await salvarRegra({ ...r, ativo: !r.ativo });
  };

  const testar = async (r: Regra) => {
    const bloco =
      blocos.find((b) => b.id === r.gatilho?.bloco_id) ??
      blocos.find((b) => b.device_id && b.device_id === r.gatilho?.device_id) ??
      blocos[0];
    if (!bloco) { toast.error("Crie um elemento no painel antes de testar."); return; }
    const feitas = await rodarRegras(
      { tipo: "clique", bloco, ligado: true },
      {
        regras: [{ ...r, gatilho: { ...r.gatilho, tipo: "bloco_clicado", bloco_id: bloco.id } }],
        blocos,
        estados: {},
        aplicarEstado: () => {},
        aviso: (t, erro) => (erro ? toast.error(t) : toast.info(t)),
      },
    );
    toast.success(feitas ? "Automação executada." : "As condições não foram atendidas agora.");
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    await excluirRegra(excluir.id);
    setExcluir(null);
    toast.success("Automação excluída.");
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Automações</h2>
          <p className="text-sm text-muted-foreground">
            Ao tocar em um elemento (mesmo sem equipamento) ou quando algo ligar, aciona outros equipamentos.
          </p>
        </div>
        <Button className="ml-auto" onClick={() => setEdit({ nome: "", ativo: true, combinador: "todas", gatilho: { tipo: "bloco_clicado" }, condicoes: [], acoes: [] })}>
          <Plus className="h-4 w-4 mr-2" /> Nova automação
        </Button>
      </div>

      {carregando && <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Carregando…</div>}

      {!carregando && !regras.length && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Workflow className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-3 text-sm text-muted-foreground">Você ainda não criou nenhuma automação.</p>
          <Button onClick={() => setEdit({ nome: "", ativo: true, combinador: "todas", gatilho: { tipo: "bloco_clicado" }, condicoes: [], acoes: [] })}>
            <Plus className="h-4 w-4 mr-2" /> Criar a primeira
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {regras.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Workflow className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {resumoGatilho(r)}
                {r.condicoes.length ? ` · ${r.condicoes.length} condição(ões)` : ""} → {resumoAcoes(r)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {r.ambiente_id ? ambientes.find((a) => a.id === r.ambiente_id)?.nome ?? "Ambiente" : "Todos os ambientes"}
              </p>
            </div>
            <Switch checked={r.ativo} onCheckedChange={() => alternar(r)} />
            <Button size="icon" variant="ghost" title="Testar agora" onClick={() => testar(r)}>
              <Play className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title="Editar" onClick={() => setEdit(r)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title="Excluir" onClick={() => setExcluir(r)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <RegraEditorDialog
        regra={edit}
        ambientes={ambientes}
        blocos={blocos}
        dispositivos={dispositivos}
        onChange={setEdit}
        onSalvo={carregar}
      />
      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
