import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Briefcase, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { maskWhatsApp } from "@/lib/masks";

interface EditContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  customerEmpresaId?: string; // ID do relacionamento customer_empresas para atualizar cargo
  onSuccess?: () => void;
}

export function EditContatoDialog({
  open,
  onOpenChange,
  customerId,
  nome = "",
  email = "",
  telefone = "",
  cargo = "",
  customerEmpresaId,
  onSuccess,
}: EditContatoDialogProps) {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        nome: nome || "",
        email: email || "",
        telefone: telefone || "",
        cargo: cargo || "",
      });
    }
  }, [open, nome, email, telefone, cargo]);

  const handleSave = async () => {
    if (!customerId) {
      toast.error("ID do contato não encontrado");
      return;
    }

    setSaving(true);
    try {
      // Atualiza dados do customer
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          nome: formData.nome.trim() || null,
          email: formData.email.trim() || null,
          telefone: formData.telefone.replace(/\D/g, "") || null,
        })
        .eq("id", customerId);

      if (customerError) throw customerError;

      // Se tiver customerEmpresaId e cargo, atualiza o cargo
      if (customerEmpresaId && formData.cargo !== cargo) {
        const { error: cargoError } = await supabase
          .from("customer_empresas")
          .update({ cargo: formData.cargo.trim() || null })
          .eq("id", customerEmpresaId);

        if (cargoError) {
          console.error("Erro ao atualizar cargo:", cargoError);
        }
      }

      toast.success("Contato atualizado com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar contato:", error);
      toast.error("Erro ao salvar contato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Contato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="edit-nome" className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              Nome
            </Label>
            <Input
              id="edit-nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Telefone/WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="edit-telefone" className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Telefone/WhatsApp
            </Label>
            <Input
              id="edit-telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: maskWhatsApp(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Cargo - só mostra se tiver empresa vinculada */}
          {customerEmpresaId && (
            <div className="space-y-2">
              <Label htmlFor="edit-cargo" className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Cargo
              </Label>
              <Input
                id="edit-cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Cargo na empresa"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
