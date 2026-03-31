import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Ticket, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Cupom {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo_desconto: string;
  valor_desconto: number;
  valor_minimo_pedido: number | null;
  usos_maximos: number | null;
  usos_atuais: number;
  ativo: boolean;
  data_inicio: string;
  data_fim: string | null;
}

const emptyCupom = {
  codigo: "",
  descricao: "",
  tipo_desconto: "percentual",
  valor_desconto: 10,
  valor_minimo_pedido: 0,
  usos_maximos: null as number | null,
  ativo: true,
  data_inicio: new Date(),
  data_fim: null as Date | null,
};

export default function EcommerceCuponsPage() {
  const navigate = useNavigate();
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCupom);
  const [estabId, setEstabId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("usuarios").select("estabelecimento_id").eq("auth_user_id", user.id).single();
      if (u) {
        setEstabId(u.estabelecimento_id);
        loadCupons(u.estabelecimento_id);
      }
    };
    init();
  }, []);

  const loadCupons = async (eid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("cupons_desconto")
      .select("*")
      .eq("estabelecimento_id", eid)
      .order("created_at", { ascending: false });
    setCupons((data as any[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyCupom);
    setDialogOpen(true);
  };

  const openEdit = (c: Cupom) => {
    setEditingId(c.id);
    setForm({
      codigo: c.codigo,
      descricao: c.descricao || "",
      tipo_desconto: c.tipo_desconto,
      valor_desconto: c.valor_desconto,
      valor_minimo_pedido: c.valor_minimo_pedido || 0,
      usos_maximos: c.usos_maximos,
      ativo: c.ativo,
      data_inicio: new Date(c.data_inicio),
      data_fim: c.data_fim ? new Date(c.data_fim) : null,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!estabId || !form.codigo.trim()) {
      toast.error("Código do cupom é obrigatório");
      return;
    }

    const payload = {
      estabelecimento_id: estabId,
      codigo: form.codigo.toUpperCase().trim(),
      descricao: form.descricao || null,
      tipo_desconto: form.tipo_desconto,
      valor_desconto: form.valor_desconto,
      valor_minimo_pedido: form.valor_minimo_pedido || 0,
      usos_maximos: form.usos_maximos,
      ativo: form.ativo,
      data_inicio: form.data_inicio.toISOString(),
      data_fim: form.data_fim ? form.data_fim.toISOString() : null,
    };

    if (editingId) {
      const { error } = await supabase.from("cupons_desconto").update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Cupom atualizado!");
    } else {
      const { error } = await supabase.from("cupons_desconto").insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); return; }
      toast.success("Cupom criado!");
    }

    setDialogOpen(false);
    loadCupons(estabId);
  };

  const toggleAtivo = async (c: Cupom) => {
    await supabase.from("cupons_desconto").update({ ativo: !c.ativo }).eq("id", c.id);
    if (estabId) loadCupons(estabId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("cupons_desconto").delete().eq("id", deleteId);
    toast.success("Cupom excluído");
    setDeleteId(null);
    if (estabId) loadCupons(estabId);
  };

  const isExpired = (c: Cupom) => c.data_fim && new Date(c.data_fim) < new Date();
  const isMaxedOut = (c: Cupom) => c.usos_maximos !== null && c.usos_atuais >= c.usos_maximos;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Cupons de Desconto
            </h1>
            <p className="text-muted-foreground text-sm">Crie e gerencie cupons promocionais para sua loja</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cupom
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : cupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> Criar primeiro cupom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {cupons.map(c => (
            <Card key={c.id} className={cn("transition-opacity", !c.ativo && "opacity-60")}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{c.codigo}</span>
                      {c.ativo && !isExpired(c) && !isMaxedOut(c) ? (
                        <Badge className="bg-green-500/10 text-green-600 text-[10px]">Ativo</Badge>
                      ) : isExpired(c) ? (
                        <Badge variant="outline" className="text-[10px] text-orange-500">Expirado</Badge>
                      ) : isMaxedOut(c) ? (
                        <Badge variant="outline" className="text-[10px] text-red-500">Esgotado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.tipo_desconto === "percentual" ? `${c.valor_desconto}% de desconto` : `R$ ${c.valor_desconto.toFixed(2)} de desconto`}
                      {c.descricao ? ` · ${c.descricao}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Início: {format(new Date(c.data_inicio), "dd/MM/yyyy")}
                      {c.data_fim ? ` · Fim: ${format(new Date(c.data_fim), "dd/MM/yyyy")}` : " · Sem validade"}
                      {c.usos_maximos !== null ? ` · ${c.usos_atuais}/${c.usos_maximos} usos` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAtivo(c)} title={c.ativo ? "Desativar" : "Ativar"}>
                    {c.ativo ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCupom(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Código *</Label>
                <Input
                  value={form.codigo}
                  onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="PROMO10"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
                  <span className="text-sm">{form.ativo ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Promoção de inauguração" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Desconto</Label>
                <Select value={form.tipo_desconto} onValueChange={v => setForm(p => ({ ...p, tipo_desconto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor do Desconto</Label>
                <Input type="number" value={form.valor_desconto} onChange={e => setForm(p => ({ ...p, valor_desconto: Number(e.target.value) }))} min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pedido Mínimo (R$)</Label>
                <Input type="number" value={form.valor_minimo_pedido || 0} onChange={e => setForm(p => ({ ...p, valor_minimo_pedido: Number(e.target.value) }))} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usos Máximos (vazio = ilimitado)</Label>
                <Input type="number" value={form.usos_maximos ?? ""} onChange={e => setForm(p => ({ ...p, usos_maximos: e.target.value ? Number(e.target.value) : null }))} min={1} placeholder="Ilimitado" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {format(form.data_inicio, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.data_inicio}
                      onSelect={d => d && setForm(p => ({ ...p, data_inicio: d }))}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de Fim (validade)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !form.data_fim && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {form.data_fim ? format(form.data_fim, "dd/MM/yyyy") : "Sem validade"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 border-b">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setForm(p => ({ ...p, data_fim: null }))}>
                        Sem validade
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={form.data_fim || undefined}
                      onSelect={d => setForm(p => ({ ...p, data_fim: d || null }))}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editingId ? "Salvar" : "Criar Cupom"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
