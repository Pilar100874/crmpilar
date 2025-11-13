import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface Estabelecimento {
  id: string;
  nome: string;
}

export function AdminEstabelecimentoSelector() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_admin) {
      setIsAdmin(true);
      loadEstabelecimentos();
      
      // Carregar seleção anterior
      const saved = sessionStorage.getItem('selectedEstabelecimentoId');
      if (saved) {
        setSelectedId(saved);
      }
    }
  };

  const loadEstabelecimentos = async () => {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('id, nome')
      .order('nome');

    if (!error && data) {
      setEstabelecimentos(data);
    }
  };

  const handleChange = (value: string) => {
    if (value === "all") {
      sessionStorage.removeItem('selectedEstabelecimentoId');
      setSelectedId("");
      toast.success("Visualizando todos os estabelecimentos");
    } else {
      sessionStorage.setItem('selectedEstabelecimentoId', value);
      setSelectedId(value);
      const estab = estabelecimentos.find(e => e.id === value);
      toast.success(`Estabelecimento: ${estab?.nome || 'Selecionado'}`);
    }
    
    // Recarregar a página para aplicar o filtro
    window.location.reload();
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">Filtrar por Estabelecimento</Label>
        <Select value={selectedId || "all"} onValueChange={handleChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Todos os estabelecimentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estabelecimentos</SelectItem>
            {estabelecimentos.map((estab) => (
              <SelectItem key={estab.id} value={estab.id}>
                {estab.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
