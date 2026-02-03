import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, User, Phone, Mail, Briefcase } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskWhatsApp } from "@/lib/masks";

interface EditContatoEmbeddedProps {
  customerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditContatoEmbedded({ customerId, onClose, onSuccess }: EditContatoEmbeddedProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    tel: "",
  });
  const [cargo, setCargo] = useState("");
  const [customerEmpresaId, setCustomerEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    loadContactData();
  }, [customerId]);

  const loadContactData = async () => {
    setLoading(true);
    try {
      // Load contact data
      const { data: contactData, error: contactError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (contactError) throw contactError;

      setFormData({
        nome: contactData.nome || "",
        email: contactData.email || "",
        telefone: contactData.telefone || "",
        tel: contactData.tel || "",
      });

      // Load primary company link for cargo
      const { data: empresaLink } = await supabase
        .from("customer_empresas")
        .select("id, cargo")
        .eq("customer_id", customerId)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (empresaLink) {
        setCargo(empresaLink.cargo || "");
        setCustomerEmpresaId(empresaLink.id);
      }
    } catch (error: any) {
      console.error("Error loading contact:", error);
      toast.error("Erro ao carregar contato");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      // Update contact
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          tel: formData.tel.trim(),
        })
        .eq("id", customerId);

      if (updateError) throw updateError;

      // Update cargo if there's a company link
      if (customerEmpresaId && cargo !== undefined) {
        await supabase
          .from("customer_empresas")
          .update({ cargo: cargo.trim() })
          .eq("id", customerEmpresaId);
      }

      toast.success("Contato atualizado com sucesso");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Editar Contato</h3>
            <p className="text-xs text-muted-foreground">Atualize as informações do contato</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-4 p-0">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome *
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                WhatsApp
              </Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: maskWhatsApp(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="tel" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone
              </Label>
              <Input
                id="tel"
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: maskPhone(e.target.value) })}
                placeholder="(00) 0000-0000"
              />
            </div>

            {/* Cargo */}
            {customerEmpresaId && (
              <div className="space-y-2">
                <Label htmlFor="cargo" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  Cargo
                </Label>
                <Input
                  id="cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Cargo na empresa"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
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
      </div>
    </div>
  );
}
