import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Phone, MapPin, Save, Loader2, FileText, Hash, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { maskCNPJ, maskWhatsApp, maskCEP } from "@/lib/masks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EditEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId?: string;
  customerId?: string;
  customerEmpresaId?: string; // Para desvincular se necessário
  onSuccess?: () => void;
}

export function EditEmpresaDialog({
  open,
  onOpenChange,
  empresaId,
  customerId,
  customerEmpresaId,
  onSuccess,
}: EditEmpresaDialogProps) {
  const [formData, setFormData] = useState({
    nome: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDesvincularAlert, setShowDesvincularAlert] = useState(false);

  useEffect(() => {
    if (open && empresaId) {
      loadEmpresa();
    }
  }, [open, empresaId]);

  const loadEmpresa = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nome: data.nome || "",
          nome_fantasia: data.nome_fantasia || "",
          cnpj: data.cnpj || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cep: data.cep || "",
          endereco: data.endereco || "",
          numero: "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          uf: data.estado || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar empresa:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      toast.error("ID da empresa não encontrado");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: formData.nome.trim() || null,
          nome_fantasia: formData.nome_fantasia.trim() || null,
          cnpj: formData.cnpj.replace(/\D/g, "") || null,
          email: formData.email.trim() || null,
          telefone: formData.telefone.replace(/\D/g, "") || null,
          cep: formData.cep.replace(/\D/g, "") || null,
          endereco: formData.endereco.trim() || null,
          numero: formData.numero.trim() || null,
          bairro: formData.bairro.trim() || null,
          cidade: formData.cidade.trim() || null,
          uf: formData.uf.trim().toUpperCase() || null,
        })
        .eq("id", empresaId);

      if (error) throw error;

      toast.success("Empresa atualizada com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      toast.error("Erro ao salvar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincular = async () => {
    if (!customerEmpresaId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("customer_empresas")
        .delete()
        .eq("id", customerEmpresaId);

      if (error) throw error;

      toast.success("Empresa desvinculada do contato!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao desvincular empresa:", error);
      toast.error("Erro ao desvincular empresa");
    } finally {
      setSaving(false);
      setShowDesvincularAlert(false);
    }
  };

  const openInNewTab = () => {
    if (empresaId) {
      window.open(`/cadastros/empresas?id=${empresaId}`, "_blank");
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Editar Empresa Vinculada
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="edit-nome" className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Razão Social
                </Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Razão social da empresa"
                />
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-2">
                <Label htmlFor="edit-fantasia" className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Nome Fantasia
                </Label>
                <Input
                  id="edit-fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia"
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="edit-cnpj" className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  CNPJ
                </Label>
                <Input
                  id="edit-cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-email-empresa" className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="edit-email-empresa"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="empresa@exemplo.com"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="edit-telefone-empresa" className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefone
                </Label>
                <Input
                  id="edit-telefone-empresa"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: maskWhatsApp(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Endereço */}
              <div className="pt-2 border-t">
                <Label className="flex items-center gap-2 text-sm mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Endereço
                </Label>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-cep" className="text-xs text-muted-foreground">
                      CEP
                    </Label>
                    <Input
                      id="edit-cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                      placeholder="00000-000"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="edit-endereco" className="text-xs text-muted-foreground">
                      Logradouro
                    </Label>
                    <Input
                      id="edit-endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, Avenida..."
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-numero" className="text-xs text-muted-foreground">
                      Número
                    </Label>
                    <Input
                      id="edit-numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="123"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label htmlFor="edit-bairro" className="text-xs text-muted-foreground">
                      Bairro
                    </Label>
                    <Input
                      id="edit-bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Bairro"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="col-span-3 space-y-1">
                    <Label htmlFor="edit-cidade" className="text-xs text-muted-foreground">
                      Cidade
                    </Label>
                    <Input
                      id="edit-cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Cidade"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-uf" className="text-xs text-muted-foreground">
                      UF
                    </Label>
                    <Input
                      id="edit-uf"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.slice(0, 2) })}
                      placeholder="SP"
                      className="h-9"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              {customerEmpresaId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDesvincularAlert(true)}
                  disabled={saving}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Desvincular
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="flex-1 sm:flex-none"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Cadastro
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDesvincularAlert} onOpenChange={setShowDesvincularAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá remover o vínculo entre este contato e a empresa. A empresa não será excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesvincular}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
