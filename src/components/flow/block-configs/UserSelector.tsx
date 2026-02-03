import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

interface UserSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export const UserSelector = ({ value, onChange, label = "Usuário", placeholder = "Selecione um usuário" }: UserSelectorProps) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const estabelecimentoId = localStorage.getItem("estabelecimentoId");
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (!error && data) {
        setUsuarios(data);
      }
      setLoading(false);
    };

    fetchUsuarios();
  }, []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {usuarios.filter(u => u.id && u.id.trim() !== '').map((usuario) => (
            <SelectItem key={usuario.id} value={usuario.id}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{usuario.nome}</span>
                <span className="text-xs text-muted-foreground">({usuario.email})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface MultiUserSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
}

export const MultiUserSelector = ({ value = [], onChange, label = "Usuários" }: MultiUserSelectorProps) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const estabelecimentoId = localStorage.getItem("estabelecimentoId");
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (!error && data) {
        setUsuarios(data);
      }
      setLoading(false);
    };

    fetchUsuarios();
  }, []);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
        ) : (
          usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                value.includes(usuario.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
              }`}
              onClick={() => toggleUser(usuario.id)}
            >
              <input
                type="checkbox"
                checked={value.includes(usuario.id)}
                onChange={() => toggleUser(usuario.id)}
                className="rounded"
              />
              <User className="h-4 w-4" />
              <span className="text-sm">{usuario.nome}</span>
              <span className="text-xs text-muted-foreground">({usuario.email})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
