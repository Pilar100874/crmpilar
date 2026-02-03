import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, User, Phone, Mail, Briefcase, Building2, Plus, Trash2, Link } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskWhatsApp } from "@/lib/masks";
import { VincularEmpresaDialog } from "./VincularEmpresaDialog";

interface EditContatoEmbeddedProps {
  customerId: string;
  onClose: () => void;
  onSuccess?: () => void;
  onEditEmpresa?: (empresaId: string, customerEmpresaId?: string) => void;
}

interface LinkedEmpresa {
  id: string;
  empresa_id: string;
  cargo: string | null;
  departamento: string | null;
  is_primary: boolean;
  empresas: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    cnpj: string | null;
  };
}

export function EditContatoEmbedded({ customerId, onClose, onSuccess, onEditEmpresa }: EditContatoEmbeddedProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    tel: "",
  });
  const [linkedEmpresas, setLinkedEmpresas] = useState<LinkedEmpresa[]>([]);
  const [showVincularDialog, setShowVincularDialog] = useState(false);

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
        .maybeSingle();

      if (contactError) throw contactError;

      if (!contactData) {
        toast.error("Contato não encontrado");
        onClose();
        return;
      }

      setFormData({
        nome: contactData.nome || "",
        email: contactData.email || "",
        telefone: contactData.telefone || "",
        tel: contactData.tel || "",
      });

      // Load linked companies
      await loadLinkedEmpresas();
    } catch (error: any) {
      console.error("Error loading contact:", error);
      toast.error("Erro ao carregar contato");
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_empresas")
        .select(`
          id,
          empresa_id,
          cargo,
          departamento,
          is_primary,
          empresas (
            id,
            nome,
            nome_fantasia,
            cnpj
          )
        `)
        .eq("customer_id", customerId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setLinkedEmpresas((data as any) || []);
    } catch (error) {
      console.error("Error loading linked empresas:", error);
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

  const handleUnlinkEmpresa = async (customerEmpresaId: string) => {
    try {
      const { error } = await supabase
        .from("customer_empresas")
        .delete()
        .eq("id", customerEmpresaId);

      if (error) throw error;
      
      toast.success("Empresa desvinculada");
      await loadLinkedEmpresas();
    } catch (error) {
      console.error("Error unlinking empresa:", error);
      toast.error("Erro ao desvincular empresa");
    }
  };

  const handleSetPrimary = async (customerEmpresaId: string) => {
    try {
      // Remove primary from all
      await supabase
        .from("customer_empresas")
        .update({ is_primary: false })
        .eq("customer_id", customerId);

      // Set new primary
      const { error } = await supabase
        .from("customer_empresas")
        .update({ is_primary: true })
        .eq("id", customerEmpresaId);

      if (error) throw error;
      
      toast.success("Empresa principal definida");
      await loadLinkedEmpresas();
    } catch (error) {
      console.error("Error setting primary:", error);
      toast.error("Erro ao definir empresa principal");
    }
  };

  const handleUpdateCargo = async (customerEmpresaId: string, cargo: string) => {
    try {
      const { error } = await supabase
        .from("customer_empresas")
        .update({ cargo })
        .eq("id", customerEmpresaId);

      if (error) throw error;
      
      await loadLinkedEmpresas();
    } catch (error) {
      console.error("Error updating cargo:", error);
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

      {/* Tabs Content */}
      <Tabs defaultValue="dados" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="dados" className="gap-2">
            <User className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="empresas" className="gap-2">
            <Building2 className="w-4 h-4" />
            Empresas ({linkedEmpresas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 overflow-y-auto p-4 mt-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresas" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="space-y-3">
            {linkedEmpresas.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-3">Nenhuma empresa vinculada</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVincularDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Empresa
                </Button>
              </Card>
            ) : (
              <>
                {linkedEmpresas.map((link) => (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {link.empresas?.nome_fantasia || link.empresas?.nome}
                          </p>
                          {link.is_primary && (
                            <Badge className="text-[10px] bg-primary text-primary-foreground">
                              Principal
                            </Badge>
                          )}
                        </div>
                        {link.empresas?.cnpj && (
                          <p className="text-xs text-muted-foreground">
                            CNPJ: {link.empresas.cnpj}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {onEditEmpresa && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Editar empresa"
                            onClick={() => onEditEmpresa(link.empresa_id, link.id)}
                          >
                            <Building2 className="w-4 h-4" />
                          </Button>
                        )}
                        {!link.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                            title="Definir como principal"
                            onClick={() => handleSetPrimary(link.id)}
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Desvincular"
                          onClick={() => handleUnlinkEmpresa(link.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Cargo Input */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Cargo nesta empresa
                      </Label>
                      <Input
                        value={link.cargo || ""}
                        onChange={(e) => handleUpdateCargo(link.id, e.target.value)}
                        placeholder="Ex: Gerente de Compras"
                        className="h-8 text-sm"
                      />
                    </div>
                  </Card>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowVincularDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Outra Empresa
                </Button>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

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

      {/* Dialogs */}
      <VincularEmpresaDialog
        open={showVincularDialog}
        onOpenChange={setShowVincularDialog}
        customerId={customerId}
        onSuccess={loadLinkedEmpresas}
      />
    </div>
  );
}
