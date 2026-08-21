import { useState, useEffect } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Loader2, Phone, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Establishment {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Establishments() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEstablishments();
  }, []);

  const fetchEstablishments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("op_establishments")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Erro ao carregar estabelecimentos", description: error.message, variant: "destructive" });
    } else {
      setEstablishments(data || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setPhone("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (est: Establishment) => {
    setEditingId(est.id);
    setName(est.name);
    setAddress(est.address || "");
    setPhone(est.phone || "");
    setIsActive(est.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      is_active: isActive,
    };

    if (editingId) {
      const { error } = await supabase
        .from("op_establishments")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Estabelecimento atualizado!" });
      }
    } else {
      const { error } = await supabase
        .from("op_establishments")
        .insert([payload]);

      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Estabelecimento criado!" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchEstablishments();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Estabelecimentos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie os estabelecimentos do sistema</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Estabelecimento
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : establishments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Nenhum estabelecimento cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {establishments.map((est) => (
              <Card key={est.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {est.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={est.is_active ? "default" : "secondary"}>
                        {est.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(est)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {est.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{est.address}</span>
                    </div>
                  )}
                  {est.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{est.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Estabelecimento" : "Novo Estabelecimento"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do estabelecimento"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
