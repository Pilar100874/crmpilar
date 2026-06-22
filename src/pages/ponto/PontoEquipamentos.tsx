import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, HardDrive, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskIP } from "@/lib/masks";
import { validateIP } from "@/lib/validators";

export default function PontoEquipamentos() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [f, setF] = useState({ nome: "", marca: "", modelo: "", ip: "", porta: "4370", serial: "" });

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_equipamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const save = async () => {
    if (!empresaId) return;
    if (!f.nome) return toast.error("Nome obrigatório");
    if (f.ip && !validateIP(f.ip)) return toast.error("IP inválido");
    const porta = parseInt(f.porta);
    if (f.porta && (isNaN(porta) || porta < 1 || porta > 65535))
      return toast.error("Porta inválida (1-65535)");
    const { error } = await supabase.from("ponto_equipamentos").insert({
      empresa_id: empresaId,
      nome: f.nome, marca: f.marca, modelo: f.modelo,
      ip: f.ip || null, porta: porta || null, serial: f.serial || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Equipamento criado");
    setOpen(false);
    setF({ nome: "", marca: "", modelo: "", ip: "", porta: "4370", serial: "" });
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_equipamentos").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); setDeleting(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Relógios / Equipamentos</h2>
          <p className="text-sm text-muted-foreground">Relógios físicos sincronizados pelo Coletor Desktop</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <HardDrive className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{e.nome}</h3>
                    <p className="text-xs text-muted-foreground">{e.marca} {e.modelo}</p>
                  </div>
                  <Badge variant={e.status === "online" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                </div>
                <p className="text-xs">IP: {e.ip}:{e.porta}</p>
                {e.ultima_sync && (
                  <p className="text-xs text-muted-foreground">
                    Última sync: {new Date(e.ultima_sync).toLocaleString("pt-BR")}
                  </p>
                )}
                <Button size="sm" variant="ghost" onClick={() => setDeleting(e)}>
                  <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Excluir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            </div>
            <div><Label>Marca</Label><Input value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} placeholder="Control iD, Henry…" /></div>
            <div><Label>Modelo</Label><Input value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></div>
            <div>
              <Label>IP</Label>
              <MaskedInput
                mask={maskIP}
                value={f.ip}
                onValueChange={(v) => setF({ ...f, ip: v })}
                invalid={!!f.ip && !validateIP(f.ip)}
                placeholder="192.168.0.10"
              />
            </div>
            <div>
              <Label>Porta</Label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={f.porta}
                onChange={(e) => setF({ ...f, porta: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2"><Label>Serial</Label><Input value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir equipamento"
      />
    </div>
  );
}
