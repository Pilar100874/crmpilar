import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipTool, CATEGORIAS_TOOL, TIPOS_TOOL } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Pencil, PlayCircle, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

const vazio: Partial<AipTool> = {
  nome: "",
  categoria: "api",
  descricao: "",
  tipo: "http",
  endpoint: "",
  metodo: "POST",
  input_schema: {},
  output_schema: {},
  permissoes: [],
  credencial_ref: "",
  timeout_seg: 30,
  retry: 1,
  status: "ativa",
  tags: [],
};

export default function ToolsPage() {
  const { items, loading, create, update, remove } = useAipTable<AipTool>("aip_tools");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipTool | null>(null);
  const [form, setForm] = useState<Partial<AipTool>>(vazio);
  const [excluir, setExcluir] = useState<AipTool | null>(null);
  const [testando, setTestando] = useState<string | null>(null);

  const filtrados = useMemo(
    () =>
      items.filter((t) =>
        `${t.nome} ${t.categoria} ${t.descricao ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
      ),
    [items, busca],
  );

  const salvar = async () => {
    if (!form.nome?.trim()) return toast.error("Informe o nome da tool");
    if (form.tipo === "http" && !form.endpoint?.trim())
      return toast.error("Informe o endpoint para tools HTTP");
    const ok = editando ? await update(editando.id, form) : await create(form);
    if (ok) setAberto(false);
  };

  const testar = async (t: AipTool) => {
    if (!t.endpoint) return toast.error("Tool sem endpoint para testar");
    setTestando(t.id);
    try {
      const res = await fetch(t.endpoint, { method: "HEAD", mode: "no-cors" });
      toast.success(`Endpoint respondeu (${res.status || "sem CORS"})`);
      await update(t.id, { status: "ativa" });
    } catch (e: any) {
      toast.error(`Falha ao testar: ${e.message}`);
      await update(t.id, { status: "erro" });
    } finally {
      setTestando(null);
    }
  };

  const parseJson = (v: string, campo: "input_schema" | "output_schema") => {
    try {
      setForm({ ...form, [campo]: v.trim() ? JSON.parse(v) : {} });
    } catch {
      /* mantém digitação inválida sem quebrar */
    }
  };

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setForm(vazio);
          setAberto(true);
        }}
        novoLabel="Nova tool"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhuma tool cadastrada."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((t) => (
            <Card key={t.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.categoria}</p>
                    </div>
                  </div>
                  <Badge variant={t.status === "ativa" ? "default" : t.status === "erro" ? "destructive" : "secondary"}>
                    {t.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{t.descricao || "—"}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{t.tipo}</Badge>
                  {t.tipo === "http" && <Badge variant="outline">{t.metodo}</Badge>}
                  <Badge variant="outline">{t.timeout_seg}s</Badge>
                </div>
                <div className="flex flex-nowrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(t);
                      setForm({ ...t });
                      setAberto(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" disabled={testando === t.id} onClick={() => testar(t)}>
                    <PlayCircle className="mr-1 h-3.5 w-3.5" /> Testar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(t)}>
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
            <DialogTitle>{editando ? "Editar tool" : "Nova tool"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_TOOL.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TOOL.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método HTTP</Label>
                <Select value={form.metodo} onValueChange={(v) => setForm({ ...form, metodo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input
                value={form.endpoint ?? ""}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://api.exemplo.com/acao"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Input schema (JSON)</Label>
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  defaultValue={JSON.stringify(form.input_schema ?? {}, null, 2)}
                  onChange={(e) => parseJson(e.target.value, "input_schema")}
                />
              </div>
              <div className="space-y-2">
                <Label>Output schema (JSON)</Label>
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  defaultValue={JSON.stringify(form.output_schema ?? {}, null, 2)}
                  onChange={(e) => parseJson(e.target.value, "output_schema")}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Credencial (nome do secret)</Label>
                <Input
                  value={form.credencial_ref ?? ""}
                  onChange={(e) => setForm({ ...form, credencial_ref: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Timeout (s)</Label>
                <Input
                  type="number"
                  value={form.timeout_seg ?? 30}
                  onChange={(e) => setForm({ ...form, timeout_seg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Retentativas</Label>
                <Input
                  type="number"
                  value={form.retry ?? 1}
                  onChange={(e) => setForm({ ...form, retry: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
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
