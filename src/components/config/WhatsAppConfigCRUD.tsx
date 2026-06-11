import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff, Info, Plus, Pencil, Trash2, Star, Phone } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type Provider = "evolution" | "cloud_api";

interface WhatsAppNumero {
  id: string;
  estabelecimento_id: string;
  nome: string;
  telefone: string | null;
  provider: Provider;
  ativo: boolean;
  is_default: boolean;
  waha_url: string | null;
  waha_api_key: string | null;
  session_name: string | null;
  cloud_phone_number_id: string | null;
  cloud_access_token: string | null;
  cloud_business_account_id: string | null;
  cloud_webhook_verify_token: string | null;
}

interface FormState {
  id?: string;
  nome: string;
  telefone: string;
  provider: Provider;
  ativo: boolean;
  is_default: boolean;
  waha_url: string;
  waha_api_key: string;
  session_name: string;
  cloud_phone_number_id: string;
  cloud_access_token: string;
  cloud_business_account_id: string;
  cloud_webhook_verify_token: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  telefone: "",
  provider: "evolution",
  ativo: true,
  is_default: false,
  waha_url: "",
  waha_api_key: "",
  session_name: "default",
  cloud_phone_number_id: "",
  cloud_access_token: "",
  cloud_business_account_id: "",
  cloud_webhook_verify_token: "",
};

export function WhatsAppConfigCRUD() {
  const [numeros, setNumeros] = useState<WhatsAppNumero[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showSecrets, setShowSecrets] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppNumero | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadNumeros();
  }, []);

  const loadNumeros = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("whatsapp_numeros")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setNumeros((data || []) as WhatsAppNumero[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao carregar números", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM, is_default: numeros.length === 0 });
    setShowSecrets(false);
    setDialogOpen(true);
  };

  const openEdit = (n: WhatsAppNumero) => {
    setForm({
      id: n.id,
      nome: n.nome || "",
      telefone: n.telefone || "",
      provider: n.provider,
      ativo: n.ativo,
      is_default: n.is_default,
      waha_url: n.waha_url || "",
      waha_api_key: n.waha_api_key || "",
      session_name: n.session_name || "default",
      cloud_phone_number_id: n.cloud_phone_number_id || "",
      cloud_access_token: n.cloud_access_token || "",
      cloud_business_account_id: n.cloud_business_account_id || "",
      cloud_webhook_verify_token: n.cloud_webhook_verify_token || "",
    });
    setShowSecrets(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe um nome/rótulo para o número", variant: "destructive" });
      return;
    }
    if (form.provider === "evolution") {
      if (!form.waha_url || !form.session_name) {
        toast({ title: "Campos obrigatórios", description: "Preencha URL e nome da sessão (Evolution)", variant: "destructive" });
        return;
      }
    } else {
      if (!form.cloud_phone_number_id || !form.cloud_access_token) {
        toast({ title: "Campos obrigatórios", description: "Preencha Phone Number ID e Access Token (Cloud API)", variant: "destructive" });
        return;
      }
    }

    try {
      setSaving(true);
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast({ title: "Erro", description: "Nenhum estabelecimento selecionado", variant: "destructive" });
        return;
      }

      const payload: any = {
        estabelecimento_id: estabelecimentoId,
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        provider: form.provider,
        ativo: form.ativo,
        is_default: form.is_default,
        waha_url: form.provider === "evolution" ? form.waha_url : null,
        waha_api_key: form.provider === "evolution" ? (form.waha_api_key || null) : null,
        session_name: form.provider === "evolution" ? form.session_name : null,
        cloud_phone_number_id: form.provider === "cloud_api" ? form.cloud_phone_number_id : null,
        cloud_access_token: form.provider === "cloud_api" ? form.cloud_access_token : null,
        cloud_business_account_id: form.provider === "cloud_api" ? (form.cloud_business_account_id || null) : null,
        cloud_webhook_verify_token: form.provider === "cloud_api" ? (form.cloud_webhook_verify_token || null) : null,
      };

      let savedId = form.id;
      if (form.id) {
        const { error } = await supabase.from("whatsapp_numeros").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("whatsapp_numeros").insert([payload]).select("id").single();
        if (error) throw error;
        savedId = data?.id;
      }

      // Garantir apenas 1 default
      if (form.is_default && savedId) {
        await supabase
          .from("whatsapp_numeros")
          .update({ is_default: false })
          .eq("estabelecimento_id", estabelecimentoId)
          .neq("id", savedId);
      }

      toast({ title: "Salvo", description: "Número do WhatsApp salvo com sucesso" });
      setDialogOpen(false);
      await loadNumeros();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: e.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (n: WhatsAppNumero) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;
      await supabase
        .from("whatsapp_numeros")
        .update({ is_default: false })
        .eq("estabelecimento_id", estabelecimentoId);
      await supabase.from("whatsapp_numeros").update({ is_default: true }).eq("id", n.id);
      toast({ title: "Padrão definido", description: `"${n.nome}" agora é o número padrão` });
      await loadNumeros();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from("whatsapp_numeros").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Excluído", description: `"${deleteTarget.nome}" removido` });
      setDeleteTarget(null);
      await loadNumeros();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Números de WhatsApp</CardTitle>
          <CardDescription>
            Cadastre quantos números quiser, escolhendo o provedor de cada um (Evolution ou WhatsApp Cloud API).
            Vincule cada bot a um número específico na tela de criação de bots.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo número
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : numeros.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nenhum número cadastrado ainda. Clique em <strong>Novo número</strong> para adicionar o primeiro.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {numeros.map((n) => (
              <div
                key={n.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4 bg-card"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-md bg-accent/40 p-2 flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{n.nome}</span>
                      {n.is_default && (
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" /> Padrão
                        </Badge>
                      )}
                      {!n.ativo && <Badge variant="outline">Inativo</Badge>}
                      <Badge variant={n.provider === "cloud_api" ? "default" : "secondary"}>
                        {n.provider === "cloud_api" ? "Cloud API (Meta)" : "Evolution"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {n.telefone || "Sem telefone informado"}
                      {n.provider === "evolution" && n.session_name && (
                        <> · sessão: <code>{n.session_name}</code></>
                      )}
                      {n.provider === "cloud_api" && n.cloud_phone_number_id && (
                        <> · phone_id: <code>{n.cloud_phone_number_id}</code></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_default && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(n)}>
                      <Star className="h-3.5 w-3.5 mr-1" /> Padrão
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(n)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(n)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar número" : "Novo número de WhatsApp"}</DialogTitle>
            <DialogDescription>
              Configure as credenciais do provedor escolhido para este número.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome / Rótulo *</Label>
                <Input
                  placeholder="Ex: Comercial SP"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (E.164)</Label>
                <Input
                  placeholder="5511999999999"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Provedor *</Label>
              <RadioGroup
                value={form.provider}
                onValueChange={(v) => setForm({ ...form, provider: v as Provider })}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <label
                  htmlFor="form-prov-evolution"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    form.provider === "evolution" ? "border-primary bg-accent/40" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="evolution" id="form-prov-evolution" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Evolution API</span>
                      <Badge variant="secondary" className="text-[10px]">Grátis</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      WhatsApp pessoal via QR Code. Sem botões/listas interativas.
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="form-prov-cloud"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    form.provider === "cloud_api" ? "border-primary bg-accent/40" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="cloud_api" id="form-prov-cloud" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Cloud API</span>
                      <Badge className="text-[10px]">Oficial Meta</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      API oficial. Pago. Suporta listas e botões.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {form.provider === "evolution" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>URL da API *</Label>
                  <Input
                    placeholder="https://evolution.seudominio.com"
                    value={form.waha_url}
                    onChange={(e) => setForm({ ...form, waha_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      placeholder="Chave da API"
                      value={form.waha_api_key}
                      onChange={(e) => setForm({ ...form, waha_api_key: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Instância/Sessão *</Label>
                  <Input
                    placeholder="default"
                    value={form.session_name}
                    onChange={(e) => setForm({ ...form, session_name: e.target.value })}
                  />
                </div>
              </div>
            )}

            {form.provider === "cloud_api" && (
              <div className="space-y-4 border-t pt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Estrutura pronta. O envio efetivo pela Cloud API será ativado na Fase 2 — por enquanto
                    o sistema continua enviando via Evolution para bots já em operação.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Phone Number ID *</Label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={form.cloud_phone_number_id}
                    onChange={(e) => setForm({ ...form, cloud_phone_number_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token *</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      placeholder="Token permanente da Cloud API"
                      value={form.cloud_access_token}
                      onChange={(e) => setForm({ ...form, cloud_access_token: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Business Account ID (WABA)</Label>
                  <Input
                    placeholder="Ex: 987654321098765"
                    value={form.cloud_business_account_id}
                    onChange={(e) => setForm({ ...form, cloud_business_account_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Verify Token</Label>
                  <Input
                    placeholder="Token livre que você define no painel Meta"
                    value={form.cloud_webhook_verify_token}
                    onChange={(e) => setForm({ ...form, cloud_webhook_verify_token: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Ativo</div>
                  <div className="text-xs text-muted-foreground">Disponível para uso pelos bots</div>
                </div>
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Padrão</div>
                  <div className="text-xs text-muted-foreground">Usado quando o bot não tem número fixo</div>
                </div>
                <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.nome}
        isLoading={deleting}
      />
    </Card>
  );
}
