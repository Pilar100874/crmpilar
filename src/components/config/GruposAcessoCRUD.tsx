import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface GrupoAcesso {
  id: string;
  nome: string;
  menus_permitidos: string[];
}

const MENUS_DISPONIVEIS = [
  "Dashboard",
  "Atendimento",
  "Clientes",
  "Campanhas",
  "Conteúdos",
  "Desenho",
  "Bot Builder",
  "Configurações",
];

export const GruposAcessoCRUD = () => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [menusPermitidos, setMenusPermitidos] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from("grupos_acesso")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar grupos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setGrupos((data || []).map(grupo => ({
        id: grupo.id,
        nome: grupo.nome,
        menus_permitidos: Array.isArray(grupo.menus_permitidos) 
          ? (grupo.menus_permitidos as string[])
          : []
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do grupo",
        variant: "destructive",
      });
      return;
    }

    const grupoData = {
      nome,
      menus_permitidos: menusPermitidos,
    };

    if (editingId) {
      const { error } = await supabase
        .from("grupos_acesso")
        .update(grupoData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Grupo atualizado com sucesso!" });
        resetForm();
        fetchGrupos();
      }
    } else {
      const { error } = await supabase
        .from("grupos_acesso")
        .insert([grupoData]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Grupo criado com sucesso!" });
        resetForm();
        fetchGrupos();
      }
    }
  };

  const resetForm = () => {
    setNome("");
    setMenusPermitidos([]);
    setEditingId(null);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setNome(grupo.nome);
    setMenusPermitidos(grupo.menus_permitidos || []);
    setEditingId(grupo.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;

    const { error } = await supabase
      .from("grupos_acesso")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Grupo excluído com sucesso!" });
      fetchGrupos();
    }
  };

  const toggleMenu = (menu: string) => {
    setMenusPermitidos((prev) =>
      prev.includes(menu)
        ? prev.filter((m) => m !== menu)
        : [...prev, menu]
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="grupo-nome">Nome do Grupo</Label>
          <Input
            id="grupo-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome do grupo"
          />
        </div>

        <div>
          <Label>Menus Permitidos</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {MENUS_DISPONIVEIS.map((menu) => (
              <div key={menu} className="flex items-center space-x-2">
                <Checkbox
                  id={`menu-${menu}`}
                  checked={menusPermitidos.includes(menu)}
                  onCheckedChange={() => toggleMenu(menu)}
                />
                <label
                  htmlFor={`menu-${menu}`}
                  className="text-sm cursor-pointer"
                >
                  {menu}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit">
          {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
        </Button>
        {editingId && (
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="ml-2"
          >
            Cancelar
          </Button>
        )}
      </form>

      <div className="space-y-2">
        {grupos.map((grupo) => (
          <div
            key={grupo.id}
            className="flex items-start justify-between p-3 border rounded-md"
          >
            <div>
              <div className="font-semibold">{grupo.nome}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Menus: {grupo.menus_permitidos?.join(", ") || "Nenhum"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(grupo)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(grupo.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
