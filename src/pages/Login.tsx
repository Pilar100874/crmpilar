import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import logo from "@/assets/logo.jpg";
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Branding panel */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-sidebar-background via-sidebar-accent to-sidebar-background items-center justify-center p-12">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.04]"
            style={{ border: "1px solid hsl(var(--primary))" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ border: "1px solid hsl(var(--primary))" }}
          />
        </div>

        <motion.div
          className="relative z-10 text-center space-y-8 max-w-md"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <motion.img
            src={logo}
            alt="Logo"
            className="h-28 w-auto mx-auto rounded-2xl shadow-2xl"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoFallback; }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          />
          <div className="space-y-3">
            <h1 className="text-4xl font-light tracking-tight text-sidebar-foreground">
              Sistema de Gestão
            </h1>
            <p className="text-sidebar-foreground/50 text-lg font-light leading-relaxed">
              Plataforma integrada para gestão<br />omnicanal do seu negócio
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "Atendimento", desc: "Multicanal" },
              { label: "Automação", desc: "Inteligente" },
              { label: "Relatórios", desc: "Em tempo real" },
              { label: "CRM", desc: "Completo" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="rounded-xl p-4 text-left"
                style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.12)" }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <p className="text-sm font-medium text-primary">{item.label}</p>
                <p className="text-xs text-sidebar-foreground/40 mt-0.5">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src={logo}
              alt="Logo"
              className="h-20 w-auto mx-auto rounded-xl shadow-lg mb-4"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoFallback; }}
            />
            <h1 className="text-2xl font-light tracking-tight text-foreground">
              Sistema de Gestão
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <Card className="border-border/40 shadow-lg bg-card">
            <form onSubmit={handleUserLogin}>
              <CardContent className="space-y-5 pt-6">
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
                    className="w-full h-11 text-sm font-medium"
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
              </CardContent>
            </form>
          </Card>

          <p className="text-center text-xs text-muted-foreground/60 mt-8">
            Plataforma Omnicanal · Todos os direitos reservados
          </p>
        </motion.div>
      </div>

      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      />
    </div>
  );
}
