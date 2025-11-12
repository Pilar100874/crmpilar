import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface UsuarioSelectorProps {
  open: boolean;
  onClose: () => void;
  estabelecimentoId: string | null;
}

export function UsuarioSelector({ open, onClose, estabelecimentoId }: UsuarioSelectorProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && estabelecimentoId) {
      fetchUsuarios();
    }
  }, [open, estabelecimentoId]);

  const fetchUsuarios = async () => {
    if (!estabelecimentoId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("nome");

    if (!error && data) {
      setUsuarios(data);
    }
    setIsLoading(false);
  };

  const handleConfirm = async () => {
    if (!selectedUsuario || !password) {
      toast.error("Por favor, selecione um usuário e digite a senha");
      return;
    }

    setIsLoading(true);

    try {
      // Buscar o email do usuário selecionado
      const usuario = usuarios.find(u => u.id === selectedUsuario);
      if (!usuario) {
        toast.error("Usuário não encontrado");
        setIsLoading(false);
        return;
      }

      // Fazer logout do usuário atual
      await supabase.auth.signOut();

      // Fazer login com o novo usuário
      const { error } = await supabase.auth.signInWithPassword({
        email: usuario.email,
        password: password,
      });

      if (error) {
        toast.error("Senha incorreta ou erro ao trocar usuário");
        setIsLoading(false);
        return;
      }

      toast.success("Usuário trocado com sucesso!");
      setPassword("");
      setSelectedUsuario("");
      onClose();
      
      // Recarregar a página para atualizar o contexto
      window.location.reload();
    } catch (error) {
      console.error("Erro ao trocar usuário:", error);
      toast.error("Erro ao trocar usuário");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Trocar Usuário
          </DialogTitle>
          <DialogDescription>
            Selecione um usuário e digite a senha para trocar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário</Label>
            <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
              <SelectTrigger id="usuario">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{usuario.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {usuario.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a senha do usuário"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirm();
                }
              }}
            />
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selectedUsuario || !password || isLoading}
            className="w-full"
          >
            {isLoading ? "Trocando..." : "Confirmar Troca"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
