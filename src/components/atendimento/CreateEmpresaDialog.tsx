import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Building2, Phone, Mail, MapPin, FileText } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskCNPJ, maskCPF, maskCEP, maskPhone } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string; // Para vincular automaticamente ao criar
  onSuccess?: (empresaId: string) => void;
}

export function CreateEmpresaDialog({ 
  open,
  onOpenChange,
  customerId,
  onSuccess,
}: CreateEmpresaDialogProps) {
  const [saving, setSaving] = useState(false);
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
    estado: "",
  });

  const resetForm = () => {
    setFormData({
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
      estado: "",
    });
  };

  const handleCepBlur = async () => {
    const cepClean = formData.cep.replace(/\D/g, "");
    if (cepClean.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (error) {
      console.error("Error looking up CEP:", error);
    }
  };

  const handleSave = async () => {
    if (!formData.nome_fantasia.trim()) {
      toast.error("Nome Fantasia é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      const { data: novaEmpresa, error: insertError } = await supabase
        .from("empresas")
        .insert({
          estabelecimento_id: estabId,
          nome: formData.nome.trim() || formData.nome_fantasia.trim(),
          nome_fantasia: formData.nome_fantasia.trim(),
          cnpj: formData.cnpj.trim() || null,
          email: formData.email.trim() || null,
          telefone: formData.telefone.trim() || null,
          cep: formData.cep.trim() || null,
          endereco: formData.endereco.trim() || null,
          bairro: formData.bairro.trim() || null,
          cidade: formData.cidade.trim() || null,
          estado: formData.estado.trim() || null,
          custom_fields: {
            numero: formData.numero.trim(),
          },
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Se temos customerId, vincular automaticamente
      if (customerId && novaEmpresa) {
        await supabase
          .from('customer_empresas')
          .insert({
            customer_id: customerId,
            empresa_id: novaEmpresa.id,
            is_primary: false
          });
      }

      toast.success("Empresa cadastrada com sucesso");
      resetForm();
      onSuccess?.(novaEmpresa.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating empresa:", error);
      toast.error("Erro ao cadastrar empresa");
    } finally {
      setSaving(false);
    }
  };

  const formatCnpjCpf = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      return maskCPF(value);
    }
    return maskCNPJ(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Nova Empresa
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Nome Fantasia */}
            <div className="space-y-2">
              <Label htmlFor="nome_fantasia" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Nome Fantasia *
              </Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                placeholder="Nome fantasia da empresa"
              />
            </div>

            {/* Razão Social */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Razão Social
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Razão social"
              />
            </div>

            {/* CNPJ/CPF */}
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                CNPJ/CPF
              </Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCnpjCpf(e.target.value) })}
                placeholder="00.000.000/0000-00"
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
                placeholder="empresa@exemplo.com"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone
              </Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                placeholder="(00) 0000-0000"
              />
            </div>

            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="cep" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                CEP
              </Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                onBlur={handleCepBlur}
                placeholder="00000-000"
              />
            </div>

            {/* Endereço + Número */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Nº"
                />
              </div>
            </div>

            {/* Bairro */}
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Bairro"
              />
            </div>

            {/* Cidade + UF */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">UF</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
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
                Cadastrar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
