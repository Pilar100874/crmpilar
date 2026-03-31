import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Settings, Save } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoId: string;
}

const allFields: Record<string, string> = {
  numero_pedido: "Nº Pedido",
  nome_cliente: "Cliente",
  telefone_cliente: "Telefone",
  email_cliente: "E-mail",
  documento_cliente: "Documento",
  endereco: "Endereço Completo",
  cidade_estado: "Cidade/Estado",
  cep: "CEP",
  itens: "Lista de Itens",
  volumes: "Volumes",
  peso: "Peso",
  transportadora: "Transportadora",
  codigo_rastreio: "Código de Rastreio",
  codigo_barras: "Código de Barras",
  data_pedido: "Data do Pedido",
  valor_total: "Valor Total",
  origem: "Origem",
  observacoes: "Observações",
};

const defaultCampos = ["numero_pedido", "nome_cliente", "endereco", "cidade_estado", "cep", "volumes", "transportadora", "codigo_rastreio", "codigo_barras", "data_pedido"];

export function EtiquetaConfigDialog({ open, onOpenChange, estabelecimentoId }: Props) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("Nova Configuração");
  const [campos, setCampos] = useState<string[]>(defaultCampos);
  const [formato, setFormato] = useState("A4");

  const { data: configs, isLoading } = useQuery({
    queryKey: ["etiqueta_config", estabelecimentoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("etiqueta_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("etiqueta_config").update({
          nome, campos_visiveis: campos, formato,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("etiqueta_config").insert({
          estabelecimento_id: estabelecimentoId, nome, campos_visiveis: campos, formato,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiqueta_config"] });
      toast.success("Configuração salva!");
      setEditingId(null);
      setNome("Nova Configuração");
      setCampos(defaultCampos);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("etiqueta_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiqueta_config"] });
      toast.success("Configuração removida!");
    },
  });

  const editConfig = (config: any) => {
    setEditingId(config.id);
    setNome(config.nome);
    setCampos(config.campos_visiveis as string[]);
    setFormato(config.formato);
  };

  const toggleCampo = (campo: string) => {
    setCampos(prev => prev.includes(campo) ? prev.filter(c => c !== campo) : [...prev, campo]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Etiqueta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing configs */}
          {configs && configs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Configurações Salvas</Label>
              {configs.map(c => (
                <Card key={c.id} className={`cursor-pointer ${editingId === c.id ? "border-primary" : ""}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div onClick={() => editConfig(c)} className="flex-1">
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {(c.campos_visiveis as string[]).length} campos • {c.formato}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Separator />

          {/* Editor */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              {editingId ? "Editando Configuração" : "Nova Configuração"}
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Formato</Label>
                <Select value={formato} onValueChange={setFormato}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="10x15">10x15 cm</SelectItem>
                    <SelectItem value="etiqueta_correios">Etiqueta Correios</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Campos visíveis na etiqueta</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(allFields).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`campo-${key}`}
                      checked={campos.includes(key)}
                      onCheckedChange={() => toggleCampo(key)}
                    />
                    <label htmlFor={`campo-${key}`} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Atualizar" : "Criar"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={() => { setEditingId(null); setNome("Nova Configuração"); setCampos(defaultCampos); }}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
