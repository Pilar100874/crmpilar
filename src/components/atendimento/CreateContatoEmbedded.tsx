import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, X, User, Phone, Mail, UserPlus } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskWhatsApp } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface CreateContatoEmbeddedProps {
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
  initialData?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
}

export function CreateContatoEmbedded({ onClose, onSuccess, initialData }: CreateContatoEmbeddedProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    email: initialData?.email || "",
    telefone: initialData?.telefone || "",
    tel: "",
  });

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .insert({
          nome: formData.nome.trim(),
          email: formData.email.trim() || null,
          telefone: formData.telefone.trim() || null,
          tel: formData.tel.trim() || null,
          estabelecimento_id: estabelecimentoId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Contato criado com sucesso");
      onSuccess?.(data.id);
      onClose();
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error("Erro ao criar contato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Novo Contato</h3>
            <p className="text-xs text-muted-foreground">Cadastre um novo contato</p>
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
                autoFocus
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
                placeholder="+55 (00) 00000-0000"
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
