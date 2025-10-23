import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Building2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      navigate("/dashboard");
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

    // Fazer login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: userPassword,
    });

    setIsLoading(false);

    if (signInError) {
      // Se não existe usuário no auth, criar um
      const { error: signUpError } = await supabase.auth.signUp({
        email: usuario.email,
        password: userPassword,
      });

      if (signUpError) {
        toast.error("Erro ao realizar login");
        return;
      }
    }

    // Salvar informações no localStorage
    localStorage.setItem("userType", "user");
    localStorage.setItem("userId", usuario.id);
    localStorage.setItem("estabelecimentoId", selectedEstabelecimento);
    toast.success("Login realizado com sucesso!");
    navigate("/dashboard");
  };

  const renderSelectType = () => (
    <Card className="shadow-lg bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Bem-vindo</CardTitle>
        <CardDescription className="text-white/70">
          Selecione o tipo de acesso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          onClick={() => setStep("admin-login")}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Acessar como Administrador
        </Button>
        <Button 
          variant="outline"
          className="w-full bg-slate-900 border-slate-700 text-white hover:bg-slate-700"
          onClick={() => setStep("select-company")}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Acessar como Usuário
        </Button>
      </CardContent>
    </Card>
  );

  const renderAdminLogin = () => (
    <Card className="shadow-lg bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Login Administrativo</CardTitle>
        <CardDescription className="text-white/70">
          Entre com suas credenciais de administrador
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAdminLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-cpf" className="text-white">CPF</Label>
            <Input
              id="admin-cpf"
              value={adminCpf}
              onChange={(e) => setAdminCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-white">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
        <CardContent className="space-y-2 pt-0">
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" 
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full text-white hover:bg-slate-700"
            onClick={() => setStep("select-type")}
          >
            Voltar
          </Button>
        </CardContent>
      </form>
    </Card>
  );

  const renderSelectCompany = () => (
    <Card className="shadow-lg bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Selecione a Empresa</CardTitle>
        <CardDescription className="text-white/70">
          Escolha o estabelecimento para acessar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white">Estabelecimento</Label>
          <Select value={selectedEstabelecimento} onValueChange={setSelectedEstabelecimento}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
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
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            onClick={() => setStep("select-user")}
            disabled={!selectedEstabelecimento}
          >
            Continuar
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-white hover:bg-slate-700"
            onClick={() => setStep("select-type")}
          >
            Voltar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectUser = () => (
    <Card className="shadow-lg bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Selecione o Usuário</CardTitle>
        <CardDescription className="text-white/70">
          Escolha seu usuário para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white">Usuário</Label>
          <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
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
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            onClick={() => setStep("user-password")}
            disabled={!selectedUsuario}
          >
            Continuar
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-white hover:bg-slate-700"
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
    <Card className="shadow-lg bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Digite sua Senha</CardTitle>
        <CardDescription className="text-white/70">
          {usuarios.find(u => u.id === selectedUsuario)?.nome}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleUserPasswordSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-password" className="text-white">Senha</Label>
            <Input
              id="user-password"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
        <CardContent className="space-y-2 pt-0">
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" 
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full text-white hover:bg-slate-700"
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Pilar BOT
          </h1>
          <p className="text-white/70 mt-2">
            Atendimento inteligente com IA
          </p>
        </div>

        {step === "select-type" && renderSelectType()}
        {step === "admin-login" && renderAdminLogin()}
        {step === "select-company" && renderSelectCompany()}
        {step === "select-user" && renderSelectUser()}
        {step === "user-password" && renderUserPassword()}
      </div>
    </div>
  );
}
