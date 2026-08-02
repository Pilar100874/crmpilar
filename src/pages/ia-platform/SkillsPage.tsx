import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipSkill } from "@/lib/aip/types";
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
import { SkillArquivosMd, enviarArquivosSkill } from "@/components/ia-platform/SkillArquivosMd";
import { BookOpen, Copy, Download, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["rascunho", "publicada", "arquivada"];

const vazio: Partial<AipSkill> = {
  nome: "",
  slug: "",
  categoria: "",
  descricao: "",
  conteudo_md: "# Nova skill\n\nDescreva aqui o conhecimento/procedimento da skill.\n",
  status: "rascunho",
  tags: [],
  ativo: true,
};

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function SkillsPage() {
  const { items, loading, create, update, remove } = useAipTable<AipSkill>("aip_skills");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipSkill | null>(null);
  const [form, setForm] = useState<Partial<AipSkill>>(vazio);
  const [excluir, setExcluir] = useState<AipSkill | null>(null);

  const filtrados = useMemo(
    () =>
      items.filter((s) =>
        `${s.nome} ${s.categoria ?? ""} ${(s.tags ?? []).join(" ")}`
          .toLowerCase()
          .includes(busca.toLowerCase()),
      ),
    [items, busca],
  );

  const salvar = async () => {
    if (!form.nome?.trim()) return toast.error("Informe o nome da skill");
    const payload = { ...form, slug: form.slug?.trim() || slugify(form.nome) };
    const ok = editando
      ? await update(editando.id, { ...payload, versao: (editando.versao ?? 1) + 1 })
      : await create(payload);
    if (ok) setAberto(false);
  };

  const exportar = (s: AipSkill) => {
    const blob = new Blob([s.conteudo_md ?? ""], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${s.slug || slugify(s.nome)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const conteudo = String(ev.target?.result ?? "");
      setEditando(null);
      setForm({
        ...vazio,
        nome: file.name.replace(/\.md$/i, ""),
        slug: slugify(file.name.replace(/\.md$/i, "")),
        conteudo_md: conteudo,
      });
      setAberto(true);
    };
    reader.readAsText(file);
    e.target.value = "";
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
        novoLabel="Nova skill"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhuma skill cadastrada."
        acoes={
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Importar .md
              <input type="file" accept=".md,text/markdown" className="hidden" onChange={importar} />
            </label>
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((s) => (
            <Card key={s.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.slug}</p>
                    </div>
                  </div>
                  <Badge variant={s.status === "publicada" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{s.descricao || "—"}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">v{s.versao}</Badge>
                  {(s.tags ?? []).slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline">
                      #{t}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-nowrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(s);
                      setForm({ ...s });
                      setAberto(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportar(s)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const { id, created_at, updated_at, estabelecimento_id, ...resto } = s as any;
                      create({ ...resto, nome: `${s.nome} (cópia)`, slug: `${s.slug}-copia`, versao: 1 });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(s)}>
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
            <DialogTitle>{editando ? "Editar skill" : "Nova skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.nome ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                      slug: editando ? form.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={form.categoria ?? ""}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={(form.tags ?? []).join(", ")}
                onChange={(e) =>
                  setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo (Markdown)</Label>
              <Textarea
                rows={16}
                className="font-mono text-sm"
                value={form.conteudo_md ?? ""}
                onChange={(e) => setForm({ ...form, conteudo_md: e.target.value })}
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
