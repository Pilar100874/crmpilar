import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { User, Mail, Phone, Building2, Users } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export default function Perfil() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [estabelecimentoName, setEstabelecimentoName] = useState("");
  const [grupoAcessoName, setGrupoAcessoName] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Buscar dados do usuário
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (usuario) {
        setUserData(usuario);

        // Buscar estabelecimento
        const estabId = await getEstabelecimentoId();
        if (estabId) {
          const { data: estabData } = await supabase
            .from("estabelecimentos")
            .select("nome")
            .eq("id", estabId)
            .maybeSingle();
          
          if (estabData) {
            setEstabelecimentoName(estabData.nome);
          }
        }

        // Buscar grupo de acesso
        if (usuario.grupo_acesso_id) {
          const { data: grupoData } = await supabase
            .from("grupos_acesso")
            .select("nome")
            .eq("id", usuario.grupo_acesso_id)
            .maybeSingle();
          
          if (grupoData) {
            setGrupoAcessoName(grupoData.nome);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do perfil");
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: userData.nome,
          telefone: userData.telefone,
        })
        .eq("id", userData.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Visualize e edite suas informações pessoais</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={userData.nome || ""}
                onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={userData.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={userData.telefone || ""}
                  onChange={(e) => setUserData({ ...userData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estabelecimento</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={estabelecimentoName || "Carregando..."}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {grupoAcessoName && (
              <div className="space-y-2">
                <Label>Grupo de Acesso</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={grupoAcessoName}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
