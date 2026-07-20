import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, X, Building2, Phone, Mail, MapPin, FileText, Plus } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskCNPJ, maskCPF, maskCEP, maskPhone } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface CreateEmpresaEmbeddedProps {
  customerId?: string; // Se fornecido, vincula automaticamente a empresa ao contato
  onClose: () => void;
  onSuccess?: (empresaId: string) => void;
  initialData?: {
    nome?: string;
    cnpj?: string;
    email?: string;
  };
}

export function CreateEmpresaEmbedded({ 
  customerId, 
  onClose, 
  onSuccess,
  initialData 
}: CreateEmpresaEmbeddedProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    nome_fantasia: initialData?.nome || "",
    cnpj: initialData?.cnpj || "",
    email: initialData?.email || "",
    telefone: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

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

  const formatCnpjCpf = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      return maskCPF(value);
    }
    return maskCNPJ(value);
  };

  const handleSave = async () => {
    if (!formData.nome_fantasia.trim()) {
      toast.error("Nome Fantasia é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Criar empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .insert({
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
          estabelecimento_id: estabelecimentoId,
          custom_fields: formData.numero ? { numero: formData.numero.trim() } : null,
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // Se tem customerId, vincular a empresa ao contato
      if (customerId && empresaData) {
        const { error: linkError } = await supabase
          .from("customer_empresas")
          .insert({
            customer_id: customerId,
            empresa_id: empresaData.id,
            estabelecimento_id: estabelecimentoId,
            is_primary: true,
          } as any);


        if (linkError) {
          console.error("Error linking empresa to customer:", linkError);
          // Não falha a operação, apenas notifica
          toast.warning("Empresa criada, mas não foi possível vincular ao contato");
        }
      }

      toast.success("Empresa criada com sucesso");
      onSuccess?.(empresaData.id);
      onClose();
    } catch (error: any) {
      console.error("Error creating empresa:", error);
      toast.error("Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Nova Empresa</h3>
            <p className="text-xs text-muted-foreground">Cadastre uma nova empresa</p>
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
                autoFocus
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
