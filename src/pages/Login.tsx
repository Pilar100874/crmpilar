import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { Lock, Mail } from "lucide-react";
import pilarBrand from "@/assets/pilar-brand.png";
import fallbackBrand from "@/assets/pilar-brand-fallback.jpg";

function usePreloadedImage(primary: string, fallback: string) {
  const [src, setSrc] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const img = new Image();
    img.onload = () => setSrc(primary);
    img.onerror = () => {
      const fb = new Image();
      fb.onload = () => setSrc(fallback);
      fb.onerror = () => setSrc(fallback);
      fb.src = fallback;
    };
    img.src = primary;
  }, [primary, fallback]);

  return src;
}

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [splashVideoUrl, setSplashVideoUrl] = useState<string | null>(null);
  const [splashVideoLoop, setSplashVideoLoop] = useState(true);
  const brandSrc = usePreloadedImage(pilarBrand, fallbackBrand);

  useEffect(() => {
    // Load splash video config
    const loadSplashVideo = async () => {
      try {
        const { data } = await supabase
          .from("system_visual_config")
          .select("splash_video_url, splash_video_loop")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.splash_video_url) {
          setSplashVideoUrl(data.splash_video_url);
          setSplashVideoLoop(data.splash_video_loop ?? true);
        }
      } catch (err) {
        console.error("Erro ao carregar splash video:", err);
      }
    };
    loadSplashVideo();

    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("id, estabelecimento_id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (usuario) {
          localStorage.setItem("userType", "user");
          localStorage.setItem("userId", usuario.id);
          localStorage.setItem("estabelecimentoId", usuario.estabelecimento_id);
          const { getInitialRouteForUsuario } = await import("@/lib/telaCustomizadaRedirect");
          navigate(await getInitialRouteForUsuario(usuario.id));
        }
      }
    };
    checkExistingSession();
  }, [navigate]);

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
      const { getInitialRouteForUsuario } = await import("@/lib/telaCustomizadaRedirect");
      navigate(await getInitialRouteForUsuario(usuario.id));
    } catch (err) {
      console.error("Erro no login:", err);
      toast.error("Erro inesperado no login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background relative overflow-hidden">
      {/* Splash Video Background */}
      {splashVideoUrl && (
        <video
          src={splashVideoUrl}
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          loop={splashVideoLoop}
          muted
          playsInline
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: splashVideoUrl
            ? "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)"
            : "linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--background)) 50%, hsl(var(--primary)/0.08) 100%)",
        }}
      />

      {/* Decorative circles */}
      {!splashVideoUrl && (
        <>
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl z-[1]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl z-[1]" />
        </>
      )}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Login Card */}
        <Card className="w-full backdrop-blur-xl bg-card/80 border-border/30 shadow-2xl rounded-2xl">
          <CardContent className="pt-7 pb-7 px-7">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Entre com suas credenciais
              </p>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="user-email"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-password" className="text-xs font-medium text-muted-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="user-password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
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
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowForgotPasswordDialog(true)}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className={`text-center text-[10px] ${splashVideoUrl ? 'text-white/30' : 'text-muted-foreground/40'}`}>
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
