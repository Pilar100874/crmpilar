import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Building2, Phone, Mail, MapPin, FileText, User, Plus, Trash2, Link, Pencil } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskCNPJ, maskCPF, maskCEP, maskPhone } from "@/lib/masks";

interface EditEmpresaEmbeddedProps {
  empresaId: string;
  customerId?: string;
  customerEmpresaId?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onEditContato?: (customerId: string) => void;
}

interface LinkedContato {
  id: string;
  customer_id: string;
  cargo: string | null;
  departamento: string | null;
  is_primary: boolean;
  customers: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
  };
}

export function EditEmpresaEmbedded({ 
  empresaId, 
  customerId, 
  customerEmpresaId,
  onClose, 
  onSuccess,
  onEditContato
}: EditEmpresaEmbeddedProps) {
  const [loading, setLoading] = useState(true);
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
  const [linkedContatos, setLinkedContatos] = useState<LinkedContato[]>([]);

  useEffect(() => {
    loadEmpresaData();
  }, [empresaId]);

  const loadEmpresaData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (error) throw error;

      setFormData({
        nome: data.nome || "",
        nome_fantasia: data.nome_fantasia || "",
        cnpj: data.cnpj || "",
        email: data.email || "",
        telefone: data.telefone || "",
        cep: data.cep || "",
        endereco: data.endereco || "",
        numero: (data.custom_fields as any)?.numero || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        estado: data.estado || "",
      });

      // Load linked contacts
      await loadLinkedContatos();
    } catch (error: any) {
      console.error("Error loading empresa:", error);
      toast.error("Erro ao carregar empresa");
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedContatos = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_empresas")
        .select(`
          id,
          customer_id,
          cargo,
          departamento,
          is_primary,
          customers (
            id,
            nome,
            email,
            telefone
          )
        `)
        .eq("empresa_id", empresaId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setLinkedContatos((data as any) || []);
    } catch (error) {
      console.error("Error loading linked contatos:", error);
    }
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
      const { error: updateError } = await supabase
        .from("empresas")
        .update({
          nome: formData.nome.trim(),
          nome_fantasia: formData.nome_fantasia.trim(),
          cnpj: formData.cnpj.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          cep: formData.cep.trim(),
          endereco: formData.endereco.trim(),
          bairro: formData.bairro.trim(),
          cidade: formData.cidade.trim(),
          estado: formData.estado.trim(),
          custom_fields: {
            numero: formData.numero.trim(),
          },
        })
        .eq("id", empresaId);

      if (updateError) throw updateError;

      toast.success("Empresa atualizada com sucesso");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error updating empresa:", error);
      toast.error("Erro ao atualizar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkContato = async (customerEmpresaLinkId: string) => {
    try {
      const { error } = await supabase
        .from("customer_empresas")
        .delete()
        .eq("id", customerEmpresaLinkId);

      if (error) throw error;
      
      toast.success("Contato desvinculado");
      await loadLinkedContatos();
    } catch (error) {
      console.error("Error unlinking contato:", error);
      toast.error("Erro ao desvincular contato");
    }
  };

  const handleSetPrimaryContato = async (customerEmpresaLinkId: string) => {
    try {
      // Remove primary from all
      await supabase
        .from("customer_empresas")
        .update({ is_primary: false })
        .eq("empresa_id", empresaId);

      // Set new primary
      const { error } = await supabase
        .from("customer_empresas")
        .update({ is_primary: true })
        .eq("id", customerEmpresaLinkId);

      if (error) throw error;
      
      toast.success("Contato principal definido");
      await loadLinkedContatos();
    } catch (error) {
      console.error("Error setting primary contato:", error);
      toast.error("Erro ao definir contato principal");
    }
  };

  const formatCnpjCpf = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      return maskCPF(value);
    }
    return maskCNPJ(value);
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
      <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Editar Empresa</h3>
            <p className="text-xs text-muted-foreground">Atualize as informações da empresa</p>
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
            <Building2 className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2">
            <User className="w-4 h-4" />
            Contatos ({linkedContatos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 overflow-y-auto p-4 mt-0">
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
        </TabsContent>

        <TabsContent value="contatos" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="space-y-3">
            {linkedContatos.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum contato vinculado</p>
              </Card>
            ) : (
              <>
                {linkedContatos.map((link) => (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {link.customers?.nome}
                          </p>
                          {link.is_primary && (
                            <Badge className="text-[10px] bg-primary text-primary-foreground">
                              Principal
                            </Badge>
                          )}
                        </div>
                        {link.customers?.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {link.customers.email}
                          </p>
                        )}
                        {link.customers?.telefone && (
                          <p className="text-xs text-muted-foreground">
                            {link.customers.telefone}
                          </p>
                        )}
                        {link.cargo && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {link.cargo}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {onEditContato && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Editar contato"
                            onClick={() => onEditContato(link.customer_id)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {!link.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                            title="Definir como principal"
                            onClick={() => handleSetPrimaryContato(link.id)}
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Desvincular"
                          onClick={() => handleUnlinkContato(link.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
        <div>
          {customerEmpresaId && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from("customer_empresas")
                    .delete()
                    .eq("id", customerEmpresaId);

                  if (error) throw error;

                  toast.success("Empresa desvinculada do contato");
                  onSuccess?.();
                  onClose();
                } catch (error: any) {
                  console.error("Error unlinking empresa:", error);
                  toast.error("Erro ao desvincular empresa");
                }
              }} 
              disabled={saving}
            >
              Desvincular do Contato
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
