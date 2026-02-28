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
import logoBranco from "@/assets/logo_branco.png";
import logoFallback from "@/assets/logo_preto.png";

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(220 18% 16%), hsl(220 15% 22%), hsl(220 18% 18%))" }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03]"
          style={{ border: "1px solid hsl(var(--primary))" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          <img
            src={logoBranco}
            alt="Logo da Empresa"
            className="h-24 w-auto mx-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoFallback; }}
          />
          <div>
            <h1 className="text-3xl font-light tracking-tight text-primary-foreground">
              Sistema de Gestão
            </h1>
            <p className="text-sm text-primary-foreground/40 mt-1.5">
              Plataforma Omnicanal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card
          className="border-0 shadow-2xl"
          style={{ background: "hsl(0 0% 100% / 0.07)", backdropFilter: "blur(20px)", borderRadius: "1rem" }}
        >
          <CardContent className="pt-8 pb-8 px-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-primary-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-primary-foreground/40 mt-1">
                Entre com suas credenciais
              </p>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="user-email" className="text-xs font-medium uppercase tracking-wider text-primary-foreground/60">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30" />
                  <Input
                    id="user-email"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 h-11 border-0 text-primary-foreground placeholder:text-primary-foreground/20"
                    style={{ background: "hsl(0 0% 100% / 0.08)" }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password" className="text-xs font-medium uppercase tracking-wider text-primary-foreground/60">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30" />
                  <Input
                    id="user-password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 border-0 text-primary-foreground placeholder:text-primary-foreground/20"
                    style={{ background: "hsl(0 0% 100% / 0.08)" }}
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
                  className="w-full text-sm text-primary-foreground/50 hover:text-primary-foreground hover:bg-primary-foreground/5"
                  onClick={() => setShowForgotPasswordDialog(true)}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Atendimento", "Automação", "Relatórios", "CRM"].map((item) => (
            <span
              key={item}
              className="text-xs px-3 py-1.5 rounded-full text-primary"
              style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.15)" }}
            >
              {item}
            </span>
          ))}
        </div>

        <p className="text-center text-xs text-primary-foreground/25">
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
