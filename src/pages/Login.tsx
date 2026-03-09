import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { Lock, Mail } from "lucide-react";
import logo from "@/assets/logo.jpg";
import logoPreto from "@/assets/logo_preto.png";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

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
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (signInError) {
        toast.error("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

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

      localStorage.setItem("userType", "user");
      localStorage.setItem("userId", usuario.id);
      localStorage.setItem("estabelecimentoId", usuario.estabelecimento_id);

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
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-background relative">
      <div
        className="absolute top-0 left-0 right-0 h-80"
        style={{ background: "var(--gradient-hero)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo na área do gradiente */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="Logo Pilar"
            className="h-20 w-auto object-contain rounded-xl shadow-lg"
            style={{ border: "3px solid red", minHeight: "80px", minWidth: "80px", background: "white" }}
          />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="user-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    id="user-email"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    id="user-password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowForgotPasswordDialog(true)}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          Plataforma Omnicanal · Todos os direitos reservados
        </p>
      </div>

      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      />
    </div>
  );
}
