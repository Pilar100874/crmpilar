import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, User, Phone, Mail, Building2, Plus, Trash2, Search } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskWhatsApp } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  options?: string[];
  required?: boolean;
}

interface ContatoFormSheetEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSuccess?: () => void;
}

export function ContatoFormSheetEdit({ open, onOpenChange, customerId, onSuccess }: ContatoFormSheetEditProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contato");
  
  // Form data
  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    email: "",
    phone: "",
    tel: "",
    position: "",
  });
  
  // Custom fields
  const [contactFields, setContactFields] = useState<CustomField[]>([]);
  
  // Empresas
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresasVinculadas, setEmpresasVinculadas] = useState<any[]>([]);
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [empresasFiltradas, setEmpresasFiltradas] = useState<any[]>([]);
  
  // Segmentos
  const [segmentos, setSegmentos] = useState<any[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  
  // Usuarios (vínculos)
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosVinculados, setUsuariosVinculados] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      if (estabId) {
        await Promise.all([
          loadCustomFields(estabId),
          loadEmpresas(estabId),
          loadSegmentos(estabId),
          loadUsuarios(estabId),
        ]);
        if (customerId) {
          await loadContactData(customerId);
        }
      }
      setLoading(false);
    };
    if (open) {
      init();
    }
  }, [open, customerId]);
  
  // Filter empresas
  useEffect(() => {
    if (buscaEmpresa.trim()) {
      const termo = buscaEmpresa.toLowerCase();
      const filtradas = empresas.filter(e => 
        e.nome_fantasia?.toLowerCase().includes(termo) ||
        e.nome?.toLowerCase().includes(termo) ||
        e.cnpj?.includes(termo)
      );
      setEmpresasFiltradas(filtradas.slice(0, 10));
    } else {
      setEmpresasFiltradas([]);
    }
  }, [buscaEmpresa, empresas]);

  const loadCustomFields = async (estabId: string) => {
    const { data } = await supabase
      .from("form_field_configs")
      .select("*")
      .eq("form_type", "contato")
      .eq("estabelecimento_id", estabId)
      .order("field_order", { ascending: true });
    
    if (data) {
      const mapped: CustomField[] = data.map((campo) => ({
        id: campo.field_id,
        label: campo.field_label,
        type: campo.field_type as CustomField["type"],
        options: (campo.options as any)?.options || [],
        required: campo.required || false,
      }));
      setContactFields(mapped);
    }
  };
  
  const loadEmpresas = async (estabId: string) => {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome, nome_fantasia, cnpj")
      .eq("estabelecimento_id", estabId)
      .order("nome_fantasia");
    setEmpresas(data || []);
  };
  
  const loadSegmentos = async (estabId: string) => {
    const { data } = await supabase
      .from("segmentos")
      .select("id, nome")
      .eq("estabelecimento_id", estabId)
      .order("nome");
    setSegmentos(data || []);
  };
  
  const loadUsuarios = async (estabId: string) => {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome")
      .eq("estabelecimento_id", estabId)
      .order("nome");
    setUsuarios(data || []);
  };

  const loadContactData = async (id: string) => {
    try {
      // Carregar contato
      const { data: customer, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const customFields = customer.custom_fields as Record<string, any> || {};
      
      setFormData({
        name: customer.nome || "",
        email: customer.email || "",
        phone: customer.telefone || "",
        tel: customer.tel || "",
        position: customFields.position || "",
        ...customFields,
      });

      // Carregar empresas vinculadas
      const { data: vinculosEmpresas } = await supabase
        .from("customer_empresas")
        .select("empresa_id, is_primary, cargo, empresas(id, nome, nome_fantasia, cnpj)")
        .eq("customer_id", id);

      if (vinculosEmpresas) {
        setEmpresasVinculadas(vinculosEmpresas.map((v: any) => ({
          id: v.empresa_id,
          nome: v.empresas?.nome,
          nome_fantasia: v.empresas?.nome_fantasia,
          cnpj: v.empresas?.cnpj,
          is_primary: v.is_primary,
          cargo: v.cargo,
        })));
      }

      // Carregar segmentos
      const { data: segmentosData } = await supabase
        .from("customer_segmentos")
        .select("segmento_id")
        .eq("customer_id", id);

      if (segmentosData) {
        setSegmentosSelecionados(segmentosData.map(s => s.segmento_id));
      }

      // Carregar vínculos de usuários
      const { data: vinculosUsuarios } = await supabase
        .from("customer_vinculos")
        .select("usuario_id")
        .eq("customer_id", id);

      if (vinculosUsuarios) {
        setUsuariosVinculados(vinculosUsuarios.map(v => v.usuario_id));
      }
    } catch (error) {
      console.error("Erro ao carregar contato:", error);
      toast.error("Erro ao carregar dados do contato");
    }
  };
  
  const handleAddEmpresa = (empresa: any) => {
    if (!empresasVinculadas.some(e => e.id === empresa.id)) {
      setEmpresasVinculadas([...empresasVinculadas, { ...empresa, is_primary: empresasVinculadas.length === 0 }]);
      setBuscaEmpresa("");
    }
  };
  
  const handleRemoveEmpresa = (empresaId: string) => {
    setEmpresasVinculadas(empresasVinculadas.filter(e => e.id !== empresaId));
  };

  const checkDuplicates = async (): Promise<boolean> => {
    if (!estabelecimentoId) return false;

    const phoneClean = formData.phone?.replace(/\D/g, "") || "";
    const emailClean = formData.email?.trim().toLowerCase() || "";

    // Verificar duplicidade de telefone
    if (phoneClean.length >= 10) {
      const { data: phoneDup } = await supabase
        .from("customers")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .neq("id", customerId)
        .or(`telefone.ilike.%${phoneClean}%`);

      if (phoneDup && phoneDup.length > 0) {
        toast.error(`WhatsApp já cadastrado em outro contato: ${phoneDup[0].nome}`);
        return true;
      }
    }

    // Verificar duplicidade de email
    if (emailClean) {
      const { data: emailDup } = await supabase
        .from("customers")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .neq("id", customerId)
        .ilike("email", emailClean);

      if (emailDup && emailDup.length > 0) {
        toast.error(`E-mail já cadastrado em outro contato: ${emailDup[0].nome}`);
        return true;
      }
    }

    return false;
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    // Verificar duplicidades
    const hasDuplicates = await checkDuplicates();
    if (hasDuplicates) return;

    setSaving(true);
    try {
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Preparar custom_fields
      const customFieldsData: Record<string, any> = {};
      contactFields.forEach(field => {
        if (!["name", "phone", "tel", "email"].includes(field.id) && formData[field.id]) {
          customFieldsData[field.id] = formData[field.id];
        }
      });
      if (formData.position) customFieldsData.position = formData.position;

      // Atualizar contato
      const { error } = await supabase
        .from("customers")
        .update({
          nome: formData.name.trim(),
          email: formData.email?.trim() || null,
          telefone: formData.phone?.trim() || null,
          tel: formData.tel?.trim() || null,
          custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
        })
        .eq("id", customerId);

      if (error) throw error;

      // Atualizar empresas vinculadas
      await supabase.from("customer_empresas").delete().eq("customer_id", customerId);
      if (empresasVinculadas.length > 0) {
        const vinculos = empresasVinculadas.map((e, idx) => ({
          customer_id: customerId,
          empresa_id: e.id,
          is_primary: idx === 0,
          cargo: formData.position || null,
        }));
        await supabase.from("customer_empresas").insert(vinculos);
      }

      // Atualizar segmentos
      await supabase.from("customer_segmentos").delete().eq("customer_id", customerId);
      if (segmentosSelecionados.length > 0) {
        const segVinculos = segmentosSelecionados.map(segId => ({
          customer_id: customerId,
          segmento_id: segId,
        }));
        await supabase.from("customer_segmentos").insert(segVinculos);
      }

      // Atualizar usuários vinculados
      await supabase.from("customer_vinculos").delete().eq("customer_id", customerId);
      if (usuariosVinculados.length > 0) {
        const usrVinculos = usuariosVinculados.map(usrId => ({
          customer_id: customerId,
          usuario_id: usrId,
          estabelecimento_id: estabelecimentoId,
        }));
        await supabase.from("customer_vinculos").insert(usrVinculos);
      }

      toast.success("Contato atualizado com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: CustomField) => {
    const value = formData[field.id] || "";
    
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.label}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={(v) => setFormData({ ...formData, [field.id]: v })}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "phone":
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: maskPhone(e.target.value) })}
            placeholder={field.label}
          />
        );
      default:
        return (
          <Input
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <SheetTitle className="text-lg">Editar Contato</SheetTitle>
                <p className="text-xs text-muted-foreground">Cadastro completo</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="contato">Contato</TabsTrigger>
                  <TabsTrigger value="empresa">Empresa</TabsTrigger>
                  <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
                </TabsList>

                <TabsContent value="contato" className="space-y-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Nome *
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do contato"
                      autoFocus
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      E-mail
                    </Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      WhatsApp
                    </Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: maskWhatsApp(e.target.value) })}
                      placeholder="+55 (00) 00000-0000"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Telefone
                    </Label>
                    <Input
                      value={formData.tel}
                      onChange={(e) => setFormData({ ...formData, tel: maskPhone(e.target.value) })}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  {/* Cargo */}
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="Cargo na empresa"
                    />
                  </div>

                  {/* Campos customizados */}
                  {contactFields
                    .filter(f => !["name", "phone", "tel", "email", "position"].includes(f.id))
                    .map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.label} {field.required && "*"}</Label>
                        {renderField(field)}
                      </div>
                    ))}
                </TabsContent>

                <TabsContent value="empresa" className="space-y-4">
                  <Card className="p-4">
                    <Label className="text-xs mb-2 block">Vincular Empresa</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={buscaEmpresa}
                          onChange={(e) => setBuscaEmpresa(e.target.value)}
                          placeholder="Buscar empresa..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    {empresasFiltradas.length > 0 && (
                      <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                        {empresasFiltradas.map((empresa) => (
                          <div
                            key={empresa.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                            onClick={() => handleAddEmpresa(empresa)}
                          >
                            <span className="text-sm">{empresa.nome_fantasia || empresa.nome}</span>
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Empresas vinculadas */}
                  {empresasVinculadas.length > 0 && (
                    <Card className="p-4">
                      <Label className="text-xs mb-2 block">Empresas Vinculadas</Label>
                      <div className="space-y-2">
                        {empresasVinculadas.map((empresa) => (
                          <div key={empresa.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{empresa.nome_fantasia || empresa.nome}</span>
                              {empresa.is_primary && (
                                <Badge variant="secondary" className="text-[10px]">Principal</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEmpresa(empresa.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="vinculos" className="space-y-4">
                  {/* Segmentos */}
                  <Card className="p-4">
                    <Label className="text-xs mb-2 block">Segmentos</Label>
                    <div className="flex flex-wrap gap-2">
                      {segmentos.map((seg) => (
                        <Badge
                          key={seg.id}
                          variant={segmentosSelecionados.includes(seg.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (segmentosSelecionados.includes(seg.id)) {
                              setSegmentosSelecionados(segmentosSelecionados.filter(s => s !== seg.id));
                            } else {
                              setSegmentosSelecionados([...segmentosSelecionados, seg.id]);
                            }
                          }}
                        >
                          {seg.nome}
                        </Badge>
                      ))}
                      {segmentos.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum segmento cadastrado</p>
                      )}
                    </div>
                  </Card>

                  {/* Usuários responsáveis */}
                  <Card className="p-4">
                    <Label className="text-xs mb-2 block">Usuários Responsáveis</Label>
                    <div className="flex flex-wrap gap-2">
                      {usuarios.map((usr) => (
                        <Badge
                          key={usr.id}
                          variant={usuariosVinculados.includes(usr.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (usuariosVinculados.includes(usr.id)) {
                              setUsuariosVinculados(usuariosVinculados.filter(u => u !== usr.id));
                            } else {
                              setUsuariosVinculados([...usuariosVinculados, usr.id]);
                            }
                          }}
                        >
                          {usr.nome}
                        </Badge>
                      ))}
                      {usuarios.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado</p>
                      )}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2">
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
