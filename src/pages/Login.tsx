import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Building2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import logo from "@/assets/logo.jpg";

type LoginStep = "select-type" | "admin-login" | "select-company" | "select-user" | "user-password";

interface Estabelecimento {
  id: string;
  nome: string;
  cnpj: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("select-type");
  const [showEstabelecimentoSelector, setShowEstabelecimentoSelector] = useState(false);
  
  // Admin login
  const [adminCpf, setAdminCpf] = useState("196.820.298-64");
  const [adminPassword, setAdminPassword] = useState("Ceotto2468");
  
  // User login
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<string>("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [userPassword, setUserPassword] = useState("");

  // Garantir logout ao entrar na tela de login
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

  useEffect(() => {
    if (step === "select-company") {
      fetchEstabelecimentos();
    }
  }, [step]);

  useEffect(() => {
    if (selectedEstabelecimento) {
      fetchUsuarios(selectedEstabelecimento);
    }
  }, [selectedEstabelecimento]);

  const fetchEstabelecimentos = async () => {
    console.log("Buscando estabelecimentos...");
    const { data, error } = await supabase
      .from("estabelecimentos")
      .select("id, nome, cnpj")
      .order("nome");

    console.log("Estabelecimentos retornados:", data);
    console.log("Erro (se houver):", error);

    if (error) {
      toast.error("Erro ao carregar estabelecimentos");
      console.error(error);
      return;
    }

    setEstabelecimentos(data || []);
  };

  const fetchUsuarios = async (estabelecimentoId: string) => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
      return;
    }

    setUsuarios(data || []);
  };

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

  const handleUserPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Buscar usuário
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", selectedUsuario)
      .single();

    if (error || !usuario) {
      setIsLoading(false);
      toast.error("Erro ao buscar usuário");
      return;
    }

    // Verificar senha
    if (usuario.senha_hash !== userPassword) {
      setIsLoading(false);
      toast.error("Senha inválida");
      return;
    }

    // Verificar se senha tem pelo menos 6 caracteres (requisito do Supabase)
    if (userPassword.length < 6) {
      setIsLoading(false);
      toast.error("A senha deve ter pelo menos 6 caracteres. Entre em contato com o administrador para atualizar sua senha.");
      return;
    }

    // Fazer login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: userPassword,
    });

    if (signInError) {
      // Se não existe usuário no auth, criar um
      const { error: signUpError } = await supabase.auth.signUp({
        email: usuario.email,
        password: userPassword,
      });

      if (signUpError) {
        if (signUpError.message.includes("weak_password") || signUpError.message.includes("6 characters")) {
          toast.error("A senha deve ter pelo menos 6 caracteres. Entre em contato com o administrador para atualizar sua senha.");
        } else {
          toast.error(`Erro ao realizar login: ${signUpError.message}`);
        }
        setIsLoading(false);
        return;
      }
    }

    // Salvar informações no localStorage
    localStorage.setItem("userType", "user");
    localStorage.setItem("userId", usuario.id);
    localStorage.setItem("estabelecimentoId", selectedEstabelecimento);
    toast.success("Login realizado com sucesso!");
    setIsLoading(false);
    navigate("/dashboard");
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
          onClick={() => setStep("select-company")}
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

  const renderSelectCompany = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Selecione a Empresa</CardTitle>
        <CardDescription>
          Escolha o estabelecimento para acessar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Estabelecimento</Label>
          <Select value={selectedEstabelecimento} onValueChange={setSelectedEstabelecimento}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um estabelecimento" />
            </SelectTrigger>
            <SelectContent>
              {estabelecimentos.map((est) => (
                <SelectItem key={est.id} value={est.id}>
                  {est.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Button 
            className="w-full"
            onClick={() => setStep("select-user")}
            disabled={!selectedEstabelecimento}
          >
            Continuar
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => setStep("select-type")}
          >
            Voltar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectUser = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Selecione o Usuário</CardTitle>
        <CardDescription>
          Escolha seu usuário para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Usuário</Label>
          <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Button 
            className="w-full"
            onClick={() => setStep("user-password")}
            disabled={!selectedUsuario}
          >
            Continuar
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setSelectedUsuario("");
              setStep("select-company");
            }}
          >
            Voltar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderUserPassword = () => (
    <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Digite sua Senha</CardTitle>
        <CardDescription>
          {usuarios.find(u => u.id === selectedUsuario)?.nome}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleUserPasswordSubmit}>
        <CardContent className="space-y-4">
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
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setUserPassword("");
              setStep("select-user");
            }}
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
            <img src={logo} alt="Logo" className="h-24 w-auto" />
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
        {step === "select-company" && renderSelectCompany()}
        {step === "select-user" && renderSelectUser()}
        {step === "user-password" && renderUserPassword()}
      </div>

      <EstabelecimentoSelector
        open={showEstabelecimentoSelector}
        onSelectEstabelecimento={handleEstabelecimentoSelected}
      />
    </div>
  );
}
