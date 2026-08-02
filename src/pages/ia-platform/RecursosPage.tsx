import { useMemo, useState } from "react";
import { useAipTable } from "@/lib/aip/db";
import { AipResource } from "@/lib/aip/types";
import { CATALOGO_RECURSOS } from "@/lib/aip/catalog";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function RecursosPage() {
  const { items, loading, create, update, remove } = useAipTable<AipResource>("aip_resources");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipResource | null>(null);
  const [form, setForm] = useState<Partial<AipResource>>({});
  const [excluir, setExcluir] = useState<AipResource | null>(null);

  const instalados = useMemo(
    () => new Map(items.map((r) => [`${r.categoria}:${r.slug}`, r])),
    [items],
  );

  const catalogoFiltrado = useMemo(
    () =>
      CATALOGO_RECURSOS.filter((c) => categoria === "todas" || c.slug === categoria).map((c) => ({
        ...c,
        itens: c.itens.filter((i) =>
          `${i.nome} ${i.descricao}`.toLowerCase().includes(busca.toLowerCase()),
        ),
      })),
    [categoria, busca],
  );

  const instalar = async (cat: string, item: { slug: string; nome: string; icone: string; descricao: string }) => {
    await create({
      categoria: cat,
      nome: item.nome,
      slug: item.slug,
      descricao: item.descricao,
      icone: item.icone,
      config: {},
      ativo: true,
    });
  };

  const salvarConfig = async () => {
    if (!editando) return;
    const ok = await update(editando.id, {
      nome: form.nome,
      descricao: form.descricao,
      ativo: form.ativo,
      config: form.config ?? {},
    });
    if (ok) setAberto(false);
  };

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        loading={loading}
        acoes={
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={categoria === "todas" ? "default" : "outline"}
              onClick={() => setCategoria("todas")}
            >
              Todas
            </Button>
            {CATALOGO_RECURSOS.map((c) => (
              <Button
                key={c.slug}
                size="sm"
                variant={categoria === c.slug ? "default" : "outline"}
                onClick={() => setCategoria(c.slug)}
              >
                {c.icone} {c.nome}
              </Button>
            ))}
          </div>
        }
      >
        <div className="space-y-6">
          {catalogoFiltrado.map(
            (cat) =>
              cat.itens.length > 0 && (
                <section key={cat.slug} className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <span>{cat.icone}</span> {cat.nome}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {cat.itens.map((item) => {
                      const recurso = instalados.get(`${cat.slug}:${item.slug}`);
                      return (
                        <Card key={item.slug} className="transition-all hover:shadow-md">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="text-2xl">{item.icone}</span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{recurso?.nome ?? item.nome}</p>
                                  <p className="truncate text-xs text-muted-foreground">{item.slug}</p>
                                </div>
                              </div>
                              {recurso && (
                                <Badge variant={recurso.ativo ? "default" : "secondary"}>
                                  {recurso.ativo ? "Ativo" : "Inativo"}
                                </Badge>
                              )}
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{item.descricao}</p>
                            {recurso ? (
                              <div className="flex flex-nowrap gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditando(recurso);
                                    setForm({ ...recurso });
                                    setAberto(true);
                                  }}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Configurar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setExcluir(recurso)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" className="w-full" onClick={() => instalar(cat.slug, item)}>
                                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ),
          )}
        </div>
      </AipToolbar>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> Configurar recurso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
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
              <Label>Configuração (JSON)</Label>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                defaultValue={JSON.stringify(form.config ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setForm({ ...form, config: e.target.value.trim() ? JSON.parse(e.target.value) : {} });
                  } catch {
                    /* json parcial */
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Guarde apenas referências de credenciais (nomes de secrets), nunca chaves em texto puro.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Recurso ativo</p>
              <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!form.nome?.trim()) return toast.error("Informe o nome");
                salvarConfig();
              }}
            >
              Salvar
            </Button>
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
