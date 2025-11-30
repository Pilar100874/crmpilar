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
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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

export function UsuarioSelector({ open, onClose, estabelecimentoId: propEstabelecimentoId }: UsuarioSelectorProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(propEstabelecimentoId);

  useEffect(() => {
    if (open) {
      fetchEstabelecimentoAndUsuarios();
    }
  }, [open, propEstabelecimentoId]);

  const fetchEstabelecimentoAndUsuarios = async () => {
    setIsLoading(true);
    
    // Tenta usar o prop, senão busca via utilitário
    let estabId = propEstabelecimentoId;
    if (!estabId) {
      estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    }

    // Se ainda não tem estabelecimento, tenta buscar do usuário logado diretamente
    if (!estabId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tenta buscar por auth_user_id
        const { data: userData } = await supabase
          .from("usuarios")
          .select("estabelecimento_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        
        if (userData?.estabelecimento_id) {
          estabId = userData.estabelecimento_id;
        } else {
          // Tenta buscar por email
          const { data: userByEmail } = await supabase
            .from("usuarios")
            .select("estabelecimento_id")
            .eq("email", user.email)
            .maybeSingle();
          
          if (userByEmail?.estabelecimento_id) {
            estabId = userByEmail.estabelecimento_id;
          }
        }
        setEstabelecimentoId(estabId);
      }
    }

    if (!estabId) {
      console.error("Nenhum estabelecimento encontrado");
      setIsLoading(false);
      return;
    }

    console.log("Buscando usuários do estabelecimento:", estabId);

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email")
      .eq("estabelecimento_id", estabId)
      .order("nome");

    console.log("Usuários encontrados:", data?.length, data);

    if (!error && data) {
      setUsuarios(data);
    } else {
      console.error("Erro ao buscar usuários:", error);
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

      // Fazer login com o novo usuário ANTES de fazer logout
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usuario.email,
        password: password,
      });

      if (signInError) {
        toast.error("Senha incorreta ou erro ao trocar usuário");
        setIsLoading(false);
        return;
      }

      // Salvar informações no localStorage
      localStorage.setItem("userType", "user");
      localStorage.setItem("userId", selectedUsuario);
      if (estabelecimentoId) {
        localStorage.setItem("estabelecimentoId", estabelecimentoId);
      }

      toast.success("Usuário trocado com sucesso!");
      setPassword("");
      setSelectedUsuario("");
      onClose();
      
      // Navegar para o dashboard
      window.location.href = "/dashboard";
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
            <Select value={selectedUsuario} onValueChange={setSelectedUsuario} disabled={isLoading}>
              <SelectTrigger id="usuario">
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um usuário"} />
              </SelectTrigger>
              <SelectContent>
                {usuarios.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum usuário disponível
                  </div>
                ) : (
                  usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{usuario.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {usuario.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
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
