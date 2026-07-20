import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskCNPJ, maskCEP, maskWhatsApp } from "@/lib/masks";
import { validateCNPJ, validateCEP, validateEmail, validateWhatsApp } from "@/lib/validators";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { useAddressLookup } from "@/hooks/useAddressLookup";

interface Empresa {
  id: string;
  nome?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

interface Props {
  empresa: Empresa | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConverted?: () => void;
}

type FieldKey = "nome" | "cnpj" | "telefone" | "email" | "cep" | "endereco" | "cidade" | "estado";

const REQUIRED: { key: FieldKey; label: string }[] = [
  { key: "nome", label: "Razão social / Nome" },
  { key: "cnpj", label: "CNPJ" },
  { key: "telefone", label: "WhatsApp / Telefone" },
  { key: "email", label: "E-mail" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado (UF)" },
];

export function ConvertProspectDialog({ empresa, open, onOpenChange, onConverted }: Props) {
  const [form, setForm] = useState<Record<FieldKey, string>>({
    nome: "", cnpj: "", telefone: "", email: "", cep: "", endereco: "", cidade: "", estado: "",
  });
  const [saving, setSaving] = useState(false);
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();
  const { lookupCEP, loading: cepLoading } = useAddressLookup();

  useEffect(() => {
    if (!empresa) return;
    setForm({
      nome: empresa.nome || empresa.nome_fantasia || "",
      cnpj: empresa.cnpj || "",
      telefone: empresa.telefone || "",
      email: empresa.email || "",
      cep: empresa.cep || "",
      endereco: empresa.endereco || "",
      cidade: empresa.cidade || "",
      estado: (empresa.estado || "").toUpperCase(),
    });
  }, [empresa, open]);

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!form.nome.trim()) e.nome = "Obrigatório";
    if (!form.cnpj.trim()) e.cnpj = "Obrigatório";
    else if (!validateCNPJ(form.cnpj)) e.cnpj = "CNPJ inválido";
    if (!form.telefone.trim()) e.telefone = "Obrigatório";
    else if (!validateWhatsApp(form.telefone)) e.telefone = "WhatsApp inválido (+55 DDD + 9 dígitos)";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!validateEmail(form.email)) e.email = "E-mail inválido";
    if (!form.cep.trim()) e.cep = "Obrigatório";
    else if (!validateCEP(form.cep)) e.cep = "CEP inválido";
    if (!form.endereco.trim()) e.endereco = "Obrigatório";
    if (!form.cidade.trim()) e.cidade = "Obrigatório";
    if (!form.estado.trim()) e.estado = "Obrigatório";
    else if (form.estado.trim().length !== 2) e.estado = "Use a sigla (2 letras)";
    return e;
  }, [form]);

  const missingCount = Object.keys(errors).length;

  const handleCNPJBlur = async () => {
    if (!validateCNPJ(form.cnpj)) return;
    const data = await lookupCNPJ(form.cnpj);
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      nome: prev.nome || data.nome || "",
      telefone: prev.telefone || (data.telefone ? maskWhatsApp(data.telefone) : ""),
      email: prev.email || data.email || "",
      cep: prev.cep || (data.cep ? maskCEP(data.cep) : ""),
      endereco: prev.endereco || [data.logradouro, data.numero].filter(Boolean).join(", "),
      cidade: prev.cidade || data.municipio || "",
      estado: prev.estado || (data.uf || "").toUpperCase(),
    }));
  };

  const handleCEPBlur = async () => {
    if (!validateCEP(form.cep)) return;
    const data = await lookupCEP(form.cep);
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      endereco: prev.endereco || data.logradouro || "",
      cidade: prev.cidade || data.localidade || "",
      estado: prev.estado || (data.uf || "").toUpperCase(),
    }));
  };

  const handleConvert = async () => {
    if (!empresa) return;
    if (missingCount > 0) {
      toast.error("Preencha todos os campos obrigatórios corretamente");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: form.nome.trim(),
          cnpj: form.cnpj,
          telefone: form.telefone,
          email: form.email.trim(),
          cep: form.cep,
          endereco: form.endereco.trim(),
          cidade: form.cidade.trim(),
          estado: form.estado.trim().toUpperCase(),
          status_comercial: "cliente_ativo",
        } as any)
        .eq("id", empresa.id);
      if (error) throw error;
      toast.success("Prospect convertido em cliente ativo");
      onOpenChange(false);
      onConverted?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao converter");
    } finally {
      setSaving(false);
    }
  };

  const field = (k: FieldKey, extra?: { onBlur?: () => void; mask?: (v: string) => string; placeholder?: string; loading?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs">
        {REQUIRED.find((r) => r.key === k)?.label}
        <span className="text-destructive"> *</span>
      </Label>
      <div className="relative">
        <Input
          value={form[k]}
          onChange={(e) => setForm((p) => ({ ...p, [k]: extra?.mask ? extra.mask(e.target.value) : e.target.value }))}
          onBlur={extra?.onBlur}
          placeholder={extra?.placeholder}
          className={errors[k] ? "border-destructive" : ""}
        />
        {extra?.loading && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter prospect em cliente ativo</DialogTitle>
          <DialogDescription>
            Complete os dados obrigatórios antes de promover essa empresa. Assim que salvar, o status muda para <b>cliente ativo</b>.
          </DialogDescription>
        </DialogHeader>

        {missingCount > 0 ? (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {missingCount} campo(s) pendente(s). Corrija abaixo para liberar a conversão.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="my-2 border-green-500/40 bg-green-500/5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription>Todos os dados obrigatórios estão preenchidos.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("nome")}
          {field("cnpj", { onBlur: handleCNPJBlur, mask: maskCNPJ, placeholder: "00.000.000/0000-00", loading: cnpjLoading })}
          {field("telefone", { mask: maskWhatsApp, placeholder: "+55 (11) 99999-9999" })}
          {field("email", { placeholder: "contato@empresa.com.br" })}
          {field("cep", { onBlur: handleCEPBlur, mask: maskCEP, placeholder: "00000-000", loading: cepLoading })}
          {field("endereco", { placeholder: "Rua, número, complemento" })}
          {field("cidade")}
          <div className="space-y-1">
            <Label className="text-xs">Estado (UF) <span className="text-destructive">*</span></Label>
            <Input
              value={form.estado}
              onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))}
              maxLength={2}
              placeholder="SP"
              className={errors.estado ? "border-destructive" : ""}
            />
            {errors.estado && <p className="text-xs text-destructive">{errors.estado}</p>}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={saving || missingCount > 0}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Converter em cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
