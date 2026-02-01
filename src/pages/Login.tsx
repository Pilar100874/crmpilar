import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import logoFallback from "@/assets/logo_preto.png";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  
  // User login
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [monitorConsent, setMonitorConsent] = useState(true); // Pré-marcado

  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Fazer login com email e senha
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (signInError) {
        toast.error("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // Buscar dados do usuário após autenticação
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (userError || !usuario) {
        toast.error("Usuário não encontrado no sistema");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Salvar consentimento de monitoramento
      if (monitorConsent) {
        await supabase
          .from("screen_monitor_consent")
          .upsert({
            usuario_id: usuario.id,
            estabelecimento_id: usuario.estabelecimento_id,
            consent_given: true,
            consent_given_at: new Date().toISOString(),
          }, {
            onConflict: 'usuario_id,estabelecimento_id'
          });
      }

      // Salvar informações no localStorage
      localStorage.setItem("userType", "user");
      localStorage.setItem("userId", usuario.id);
      localStorage.setItem("estabelecimentoId", usuario.estabelecimento_id);
      localStorage.setItem("monitorConsent", monitorConsent ? "true" : "false");
      
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Erro no login:", err);
      toast.error("Erro inesperado no login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logoFallback} alt="Logo da Empresa - Sistema de Gestão" className="h-24 w-auto" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Sistema de Gestão
          </h1>
          <p className="text-lg text-muted-foreground font-light mt-2">
            Plataforma integrada para gestão de negócios
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Login</CardTitle>
            <CardDescription>
              Entre com seu email e senha
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUserLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Senha</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="monitor-consent"
                  checked={monitorConsent}
                  onCheckedChange={(checked) => setMonitorConsent(checked === true)}
                />
                <label
                  htmlFor="monitor-consent"
                  className="text-xs text-muted-foreground leading-tight cursor-pointer"
                >
                  Autorizo o monitoramento de tela pelo supervisor para fins de qualidade e treinamento
                </label>
              </div>
            </CardContent>
            <CardContent className="space-y-2 pt-0">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setShowForgotPasswordDialog(true)}
              >
                Esqueci minha senha
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
      
      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      />
    </div>
  );
}
