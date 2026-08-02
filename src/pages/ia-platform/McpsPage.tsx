import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipMcp } from "@/lib/aip/types";
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
import { Pencil, Plug, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const vazio: Partial<AipMcp> = {
  nome: "",
  endpoint: "",
  tipo: "http",
  descricao: "",
  status: "desconectado",
  ferramentas: [],
  ambiente: "producao",
  credencial_ref: "",
};

export default function McpsPage() {
  const { items, loading, create, update, remove } = useAipTable<AipMcp>("aip_mcps");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipMcp | null>(null);
  const [form, setForm] = useState<Partial<AipMcp>>(vazio);
  const [excluir, setExcluir] = useState<AipMcp | null>(null);
  const [testando, setTestando] = useState<string | null>(null);

  const filtrados = useMemo(
    () => items.filter((m) => `${m.nome} ${m.endpoint}`.toLowerCase().includes(busca.toLowerCase())),
    [items, busca],
  );

  const salvar = async () => {
    if (!form.nome?.trim() || !form.endpoint?.trim())
      return toast.error("Informe nome e endpoint do MCP");
    const ok = editando ? await update(editando.id, form) : await create(form);
    if (ok) setAberto(false);
  };

  const testarConexao = async (m: AipMcp) => {
    setTestando(m.id);
    try {
      const res = await fetch(m.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      const texto = await res.text();
      let ferramentas: Array<{ name: string; description?: string }> = [];
      try {
        const json = JSON.parse(texto.replace(/^data:\s*/gm, "").trim().split("\n")[0]);
        ferramentas = json?.result?.tools ?? [];
      } catch {
        /* resposta não JSON */
      }
      await update(m.id, {
        status: res.ok ? "conectado" : "erro",
        ferramentas,
        ultimo_handshake: new Date().toISOString(),
        ultimo_erro: res.ok ? null : `HTTP ${res.status}`,
      });
      toast[res.ok ? "success" : "error"](
        res.ok ? `Conectado — ${ferramentas.length} ferramenta(s)` : `Falha HTTP ${res.status}`,
      );
    } catch (e: any) {
      await update(m.id, { status: "erro", ultimo_erro: e.message });
      toast.error(`Erro de conexão: ${e.message}`);
    } finally {
      setTestando(null);
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
        novoLabel="Novo MCP"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhum servidor MCP cadastrado."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((m) => (
            <Card key={m.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Plug className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.endpoint}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      m.status === "conectado" ? "default" : m.status === "erro" ? "destructive" : "secondary"
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{m.tipo}</Badge>
                  <Badge variant="outline">{m.ambiente}</Badge>
                  <Badge variant="outline">{m.ferramentas?.length ?? 0} tools</Badge>
                </div>
                {m.ultimo_handshake && (
                  <p className="text-xs text-muted-foreground">
                    Último handshake: {new Date(m.ultimo_handshake).toLocaleString("pt-BR")}
                  </p>
                )}
                {m.ultimo_erro && <p className="text-xs text-destructive">{m.ultimo_erro}</p>}
                <div className="flex flex-nowrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(m);
                      setForm({ ...m });
                      setAberto(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testando === m.id}
                    onClick={() => testarConexao(m)}
                  >
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${testando === m.id ? "animate-spin" : ""}`} />
                    Testar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(m)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar MCP" : "Novo MCP"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input
                value={form.endpoint ?? ""}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://servidor/mcp"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["http", "sse", "stdio"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={form.ambiente} onValueChange={(v) => setForm({ ...form, ambiente: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["producao", "homologacao", "desenvolvimento"].map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credencial</Label>
                <Input
                  value={form.credencial_ref ?? ""}
                  onChange={(e) => setForm({ ...form, credencial_ref: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
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
