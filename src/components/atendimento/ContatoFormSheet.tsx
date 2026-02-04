import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, User, Phone, Mail, Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskWhatsApp } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { VincularEmpresaDialog } from "./VincularEmpresaDialog";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  options?: string[];
  required?: boolean;
}

interface ContatoFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customerId: string) => void;
  initialData?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
}

export function ContatoFormSheet({ open, onOpenChange, onSuccess, initialData }: ContatoFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contato");
  
  // Form data
  const [formData, setFormData] = useState<Record<string, any>>({
    name: initialData?.nome || "",
    email: initialData?.email || "",
    phone: initialData?.telefone || "",
    tel: "",
    position: "",
  });
  
  // Custom fields
  const [contactFields, setContactFields] = useState<CustomField[]>([]);
  
  // Empresas
  const [empresasVinculadas, setEmpresasVinculadas] = useState<any[]>([]);
  const [showVincularEmpresa, setShowVincularEmpresa] = useState(false);
  
  // Segmentos
  const [segmentos, setSegmentos] = useState<any[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  
  // Usuarios (vínculos)
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosVinculados, setUsuariosVinculados] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Função auxiliar para buscar usuário logado
  const loadCurrentUser = async () => {
    try {
      const authResponse = await supabase.auth.getUser();
      const authUser = authResponse.data?.user;
      if (authUser) {
        // @ts-ignore - Supabase types depth issue
        const result = await supabase
          .from("usuarios")
          .select("id")
          .eq("auth_id", authUser.id)
          .maybeSingle();
        
        if (result.data?.id) {
          setCurrentUserId(result.data.id);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar usuário logado:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      if (estabId) {
        loadCustomFields(estabId);
        loadSegmentos(estabId);
        loadUsuarios(estabId);
        loadCurrentUser();
      }
    };
    if (open) {
      init();
    }
  }, [open]);
  
  // Reset form when opening e auto-vincular usuário logado
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.nome || "",
        email: initialData?.email || "",
        phone: initialData?.telefone || "",
        tel: "",
        position: "",
      });
      setEmpresasVinculadas([]);
      setSegmentosSelecionados([]);
      // Auto-vincular usuário logado se disponível
      if (currentUserId) {
        setUsuariosVinculados([currentUserId]);
      } else {
        setUsuariosVinculados([]);
      }
      setActiveTab("contato");
    }
  }, [open, initialData, currentUserId]);
  

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
  
  const handleAddEmpresa = (empresa: any) => {
    if (!empresasVinculadas.some(e => e.id === empresa.id)) {
      setEmpresasVinculadas([...empresasVinculadas, { ...empresa, is_primary: empresasVinculadas.length === 0 }]);
    }
  };
  
  const handleRemoveEmpresa = (empresaId: string) => {
    setEmpresasVinculadas(empresasVinculadas.filter(e => e.id !== empresaId));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (segmentosSelecionados.length === 0) {
      toast.error("Selecione pelo menos 1 segmento");
      setActiveTab("vinculos");
      return;
    }

    setSaving(true);
    try {
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Validar duplicidade de email
      if (formData.email?.trim()) {
        const { data: existingEmail } = await supabase
          .from("customers")
          .select("id")
          .eq("estabelecimento_id", estabelecimentoId)
          .eq("email", formData.email.trim())
          .maybeSingle();
        
        if (existingEmail) {
          toast.error("E-mail já cadastrado em outro contato");
          setSaving(false);
          return;
        }
      }

      // Validar duplicidade de WhatsApp
      if (formData.phone?.trim()) {
        const cleanPhone = formData.phone.replace(/\D/g, '');
        const { data: existingPhone } = await supabase
          .from("customers")
          .select("id, telefone")
          .eq("estabelecimento_id", estabelecimentoId)
          .not("telefone", "is", null);
        
        const duplicate = existingPhone?.find(c => 
          c.telefone?.replace(/\D/g, '') === cleanPhone
        );
        
        if (duplicate) {
          toast.error("WhatsApp já cadastrado em outro contato");
          setSaving(false);
          return;
        }
      }

      // Preparar custom_fields
      const customFieldsData: Record<string, any> = {};
      contactFields.forEach(field => {
        if (!["name", "phone", "tel", "email"].includes(field.id) && formData[field.id]) {
          customFieldsData[field.id] = formData[field.id];
        }
      });
      if (formData.position) customFieldsData.position = formData.position;

      // Criar contato
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          nome: formData.name.trim(),
          email: formData.email?.trim() || null,
          telefone: formData.phone?.trim() || null,
          tel: formData.tel?.trim() || null,
          estabelecimento_id: estabelecimentoId,
          custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Vincular empresas
      if (empresasVinculadas.length > 0) {
        const vinculos = empresasVinculadas.map((e, idx) => ({
          customer_id: newCustomer.id,
          empresa_id: e.id,
          is_primary: idx === 0,
          cargo: formData.position || null,
        }));
        await supabase.from("customer_empresas").insert(vinculos);
      }

      // Vincular segmentos
      if (segmentosSelecionados.length > 0) {
        const segVinculos = segmentosSelecionados.map(segId => ({
          customer_id: newCustomer.id,
          segmento_id: segId,
        }));
        await supabase.from("customer_segmentos").insert(segVinculos);
      }

      // Vincular usuários
      if (usuariosVinculados.length > 0) {
        const usrVinculos = usuariosVinculados.map(usrId => ({
          customer_id: newCustomer.id,
          usuario_id: usrId,
          estabelecimento_id: estabelecimentoId,
        }));
        await supabase.from("customer_vinculos").insert(usrVinculos);
      }

      toast.success("Contato criado com sucesso!");
      onSuccess?.(newCustomer.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error("Erro ao criar contato: " + error.message);
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
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <SheetTitle className="text-lg">Novo Contato</SheetTitle>
              <p className="text-xs text-muted-foreground">Cadastro completo</p>
            </div>
          </div>
        </SheetHeader>

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
                   onChange={(e) => setFormData({ ...formData, tel: maskWhatsApp(e.target.value) })}
                   placeholder="+55 (00) 00000-0000"
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowVincularEmpresa(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Empresa
                </Button>
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
      </SheetContent>
      
      {/* Dialog de vincular empresa */}
      <VincularEmpresaDialog
        open={showVincularEmpresa}
        onOpenChange={setShowVincularEmpresa}
        modoFormulario={true}
        onEmpresaVinculada={handleAddEmpresa}
      />
    </Sheet>
  );
}
