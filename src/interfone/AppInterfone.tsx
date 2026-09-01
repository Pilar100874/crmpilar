import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Loader2 } from "lucide-react";
import PortariaAtendimentoMobile from "@/pages/portaria/PortariaAtendimentoMobile";
import logoPilar from "@/assets/logo-2.png";

/** App nativo da Portaria: só interfone (campainha/câmeras) e ramal SIP. */
export default function AppInterfone() {
  const [sessao, setSessao] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) setErro("E-mail ou senha inválidos.");
    setEntrando(false);
  };

  if (sessao === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center space-y-2 text-center">
            <img src={logoPilar} alt="Pilar Portaria" className="h-12 w-auto object-contain" />
            <CardTitle className="text-base">Pilar Portaria</CardTitle>
            <p className="text-xs text-muted-foreground">Interfone e ramal SIP</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={entrar}>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={entrando}>
                {entrando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PortariaAtendimentoMobile />
      <div className="mx-auto w-full max-w-md px-3 pb-6">
        <Button variant="ghost" size="sm" className="w-full" onClick={() => void supabase.auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
