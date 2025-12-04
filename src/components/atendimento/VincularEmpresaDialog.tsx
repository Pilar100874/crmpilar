import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2, Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VincularEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  onSuccess?: () => void;
}

interface Empresa {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  custom_fields?: any;
}

export function VincularEmpresaDialog({
  open,
  onOpenChange,
  customerId,
  onSuccess
}: VincularEmpresaDialogProps) {
  const [busca, setBusca] = useState("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasFiltradas, setEmpresasFiltradas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinculando, setVinculando] = useState(false);

  useEffect(() => {
    if (open) {
      loadEmpresas();
    }
  }, [open]);

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, cnpj, custom_fields')
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (valor: string) => {
    setBusca(valor);
    if (valor.trim()) {
      const termo = valor.toLowerCase();
      const filtradas = empresas.filter(emp =>
        emp.nome_fantasia?.toLowerCase().includes(termo) ||
        emp.nome?.toLowerCase().includes(termo) ||
        emp.cnpj?.includes(termo.replace(/\D/g, ''))
      );
      setEmpresasFiltradas(filtradas);
    } else {
      setEmpresasFiltradas([]);
    }
  };

  const handleVincular = async (empresaId: string) => {
    if (!customerId) {
      toast.error("Cliente não identificado");
      return;
    }

    setVinculando(true);
    try {
      const { error } = await supabase
        .from('customer_empresas')
        .insert({
          customer_id: customerId,
          empresa_id: empresaId,
          is_primary: false
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("Empresa já está vinculada a este cliente");
        } else {
          throw error;
        }
      } else {
        toast.success("Empresa vinculada com sucesso!");
        onSuccess?.();
        onOpenChange(false);
        setBusca("");
        setEmpresasFiltradas([]);
      }
    } catch (error: any) {
      console.error('Erro ao vincular empresa:', error);
      toast.error(error?.message || "Erro ao vincular empresa");
    } finally {
      setVinculando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Vincular Empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo de busca */}
          <div className="space-y-2">
            <Label className="text-sm">Buscar Empresa</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Digite nome, CNPJ..."
                value={busca}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Lista de empresas filtradas */}
          {!loading && empresasFiltradas.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {empresasFiltradas.map((empresa) => (
                <Card
                  key={empresa.id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleVincular(empresa.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {empresa.nome_fantasia || empresa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {empresa.cnpj || 'Sem CNPJ'}
                      </p>
                    </div>
                    {vinculando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Mensagem quando não encontra */}
          {!loading && busca && empresasFiltradas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma empresa encontrada</p>
            </div>
          )}

          {/* Estado inicial */}
          {!loading && !busca && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Digite para buscar uma empresa</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
