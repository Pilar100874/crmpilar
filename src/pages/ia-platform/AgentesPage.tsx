import { ModeloSelect } from "@/components/ia-platform/ModeloSelect";
import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipAgent, AipSkill, AipTool, AipMcp, MODELOS_IA } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Bot, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const vazio: Partial<AipAgent> = {
  nome: "",
  descricao: "",
  categoria: "",
  modelo_ia: MODELOS_IA[0],
  prompt_principal: "",
  skill_ids: [],
  tool_ids: [],
  mcp_ids: [],
  limite_custo: null,
  limite_tempo_seg: 300,
  tags: [],
  ativo: true,
};

export default function AgentesPage() {
  const { items, loading, create, update, remove } = useAipTable<AipAgent>("aip_agents");
  const { items: skills } = useAipTable<AipSkill>("aip_skills");
  const { items: tools } = useAipTable<AipTool>("aip_tools");
  const { items: mcps } = useAipTable<AipMcp>("aip_mcps");

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipAgent | null>(null);
  const [form, setForm] = useState<Partial<AipAgent>>(vazio);
  const [excluir, setExcluir] = useState<AipAgent | null>(null);

  const filtrados = useMemo(
    () =>
      items.filter((a) =>
        `${a.nome} ${a.descricao ?? ""} ${a.categoria ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
      ),
    [items, busca],
  );

  const abrirNovo = () => {
    setEditando(null);
    setForm(vazio);
    setAberto(true);
  };

  const abrirEdicao = (a: AipAgent) => {
    setEditando(a);
    setForm({ ...a });
    setAberto(true);
  };

  const salvar = async () => {
    if (!form.nome?.trim()) return toast.error("Informe o nome do agente");
    if (!form.prompt_principal?.trim()) return toast.error("Informe o prompt principal");
    const payload = { ...form, tags: form.tags ?? [] };
    const ok = editando
      ? await update(editando.id, { ...payload, versao: (editando.versao ?? 1) + 1 })
      : await create(payload);
    if (ok) setAberto(false);
  };

  const duplicar = async (a: AipAgent) => {
    const { id, created_at, updated_at, estabelecimento_id, ...resto } = a as any;
    await create({ ...resto, nome: `${a.nome} (cópia)`, versao: 1 });
  };

  const toggleId = (campo: "skill_ids" | "tool_ids" | "mcp_ids", id: string) => {
    const atual = (form[campo] as string[]) ?? [];
    setForm({
      ...form,
      [campo]: atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    });
  };

  const listaSelecao = (
    campo: "skill_ids" | "tool_ids" | "mcp_ids",
    dados: Array<{ id: string; nome: string; descricao?: string | null }>,
  ) => (
    <ScrollArea className="h-56 rounded-lg border border-border p-2">
      {dados.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        dados.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted">
            <Checkbox
              checked={((form[campo] as string[]) ?? []).includes(d.id)}
              onCheckedChange={() => toggleId(campo, d.id)}
            />
            <span className="min-w-0">
              <span className="block text-sm">{d.nome}</span>
              {d.descricao && (
                <span className="block truncate text-xs text-muted-foreground">{d.descricao}</span>
              )}
            </span>
          </label>
        ))
      )}
    </ScrollArea>
  );

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        onNovo={abrirNovo}
        novoLabel="Novo agente"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhum agente cadastrado. Crie o primeiro para começar."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((a) => (
            <Card key={a.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.categoria || "Sem categoria"}</p>
                    </div>
                  </div>
                  <Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{a.descricao || "—"}</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline">{a.modelo_ia}</Badge>
                  <Badge variant="outline">v{a.versao}</Badge>
                  <Badge variant="outline">{a.skill_ids?.length ?? 0} skills</Badge>
                  <Badge variant="outline">{a.tool_ids?.length ?? 0} tools</Badge>
                </div>
                <div className="flex flex-nowrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicao(a)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicar(a)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(a)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar agente" : "Novo agente"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="recursos">Recursos</TabsTrigger>
              <TabsTrigger value="limites">Limites</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={form.categoria ?? ""}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Ex: Marketing"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modelo de IA</Label>
                  <ModeloSelect
                    value={form.modelo_ia}
                    onChange={(v) => setForm({ ...form, modelo_ia: v })}
                  />

                </div>
                <div className="space-y-2">
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={(form.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Agente ativo</p>
                  <p className="text-xs text-muted-foreground">Agentes inativos não podem ser executados</p>
                </div>
                <Switch
                  checked={form.ativo ?? true}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-2 pt-4">
              <Label>Prompt principal (system)</Label>
              <Textarea
                rows={14}
                className="font-mono text-sm"
                value={form.prompt_principal ?? ""}
                onChange={(e) => setForm({ ...form, prompt_principal: e.target.value })}
                placeholder="Você é um agente especialista em..."
              />
            </TabsContent>

            <TabsContent value="recursos" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Skills</Label>
                {listaSelecao("skill_ids", skills)}
              </div>
              <div className="space-y-2">
                <Label>Tools</Label>
                {listaSelecao("tool_ids", tools)}
              </div>
              <div className="space-y-2">
                <Label>MCPs</Label>
                {listaSelecao("mcp_ids", mcps)}
              </div>
            </TabsContent>

            <TabsContent value="limites" className="grid gap-4 pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Limite de custo por execução (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.limite_custo ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, limite_custo: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo máximo (segundos)</Label>
                <Input
                  type="number"
                  value={form.limite_tempo_seg ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, limite_tempo_seg: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome}
        onConfirm={async () => {
          if (excluir) await remove(excluir.id);
          setExcluir(null);
        }}
      />
    </>
  );
}
