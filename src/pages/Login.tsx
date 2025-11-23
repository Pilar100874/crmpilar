import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Building2, ShieldCheck } from "lucide-react";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import logo from "@/assets/logo.jpg";
import logoFallback from "@/assets/logo_preto.png";

type LoginStep = "select-type" | "admin-login" | "user-login";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("select-type");
  const [showEstabelecimentoSelector, setShowEstabelecimentoSelector] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  
  // Admin login
  const [adminCpf, setAdminCpf] = useState("196.820.298-64");
  const [adminPassword, setAdminPassword] = useState("Ceotto2468");
  
  // User login
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanCpf = adminCpf.replace(/\D/g, "");

    try {
      // Secure admin validation via RPC (bypasses RLS safely)
      const { data: adminId, error: rpcError } = await supabase.rpc("admin_login", {
        cpf_input: cleanCpf,
        password_input: adminPassword,
      });

      if (rpcError || !adminId) {
        toast.error("CPF ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // Criar/entrar sessão Auth com email sintético
      const email = `admin_${cleanCpf}@sistema.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: adminPassword,
      });

      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: adminPassword,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) {
          toast.error("Erro ao realizar login");
          setIsLoading(false);
          return;
        }
      }

      localStorage.setItem("userType", "admin");
      localStorage.setItem("userId", adminId as string);
      toast.success("Login realizado com sucesso!");
      
      // Mostrar seletor de estabelecimento para admins
      setShowEstabelecimentoSelector(true);
    } catch (err) {
      console.error("Erro no login admin:", err);
      toast.error("Erro inesperado no login");
    } finally {
      setIsLoading(false);
    }
  };

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

      // Salvar informações no localStorage
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

  const handleEstabelecimentoSelected = (estabelecimentoId: string) => {
    setShowEstabelecimentoSelector(false);
    navigate("/dashboard");
  };

  const renderSelectType = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Bem-vindo</CardTitle>
        <CardDescription>
          Selecione o tipo de acesso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          className="w-full"
          onClick={() => setStep("admin-login")}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Acessar como Administrador
        </Button>
        <Button 
          variant="outline"
          className="w-full"
          onClick={() => setStep("user-login")}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Acessar como Usuário
        </Button>
      </CardContent>
    </Card>
  );

  const renderAdminLogin = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Login Administrativo</CardTitle>
        <CardDescription>
          Entre com suas credenciais de administrador
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAdminLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-cpf">CPF</Label>
            <Input
              id="admin-cpf"
              value={adminCpf}
              onChange={(e) => setAdminCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
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
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full"
            onClick={() => setStep("select-type")}
          >
            Voltar
          </Button>
        </CardContent>
      </form>
    </Card>
  );

  const renderUserLogin = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Login de Usuário</CardTitle>
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
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full"
            onClick={() => setStep("select-type")}
          >
            Voltar
          </Button>
        </CardContent>
      </form>
    </Card>
  );

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

        {step === "select-type" && renderSelectType()}
        {step === "admin-login" && renderAdminLogin()}
        {step === "user-login" && renderUserLogin()}
      </div>

      <EstabelecimentoSelector
        open={showEstabelecimentoSelector}
        onSelectEstabelecimento={handleEstabelecimentoSelected}
      />
      
      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      />
    </div>
  );
}
