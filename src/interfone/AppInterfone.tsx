import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Loader2, BellRing, Phone, ShieldAlert } from "lucide-react";
import PortariaAtendimentoMobile from "@/pages/portaria/PortariaAtendimentoMobile";
import AtualizadorApk from "@/components/portaria/AtualizadorApk";
import logoPilar from "@/assets/logo_branco.png";

/** App nativo da Portaria: só interfone (campainha/câmeras) e ramal SIP. */
export default function AppInterfone() {
  const [sessao, setSessao] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [permitido, setPermitido] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessao) {
      setPermitido(null);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("pode_usar_interfone, pilarfone_abas")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (!cancelado) {
        const registro = data as { pode_usar_interfone?: boolean; pilarfone_abas?: string[] | null } | null;
        // Acesso pelo campo antigo (legado) ou por pelo menos uma aba liberada no cadastro.
        setPermitido(!!registro?.pode_usar_interfone || (registro?.pilarfone_abas?.length ?? 0) > 0);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [sessao]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#0D1626]">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#16253E] to-[#0D1626] p-4">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <img src={logoPilar} alt="Pilar Fone" className="h-14 w-auto object-contain drop-shadow" />
            <div className="h-1 w-16 rounded-full bg-orange-500" />
            <div>
              <h1 className="text-lg font-semibold text-white">Pilar Fone</h1>
              <p className="text-xs text-slate-400">Interfone e ramal SIP</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={entrar}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus-visible:ring-orange-500"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-slate-300">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus-visible:ring-orange-500"
                placeholder="••••••••"
              />
            </div>
            {erro && <p className="text-sm text-red-400">{erro}</p>}
            <Button
              type="submit"
              className="w-full bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
              disabled={entrando}
            >
              {entrando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><BellRing className="h-3 w-3" /> Campainha</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Ramal SIP</span>
          </div>
        </div>
      </div>
    );
  }

  if (permitido === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1626]">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!permitido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#16253E] to-[#0D1626] p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-orange-500" />
        <div>
          <h1 className="text-lg font-semibold text-white">Acesso não liberado</h1>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            Seu usuário não tem permissão para usar o interfone. Peça ao administrador para liberar o acesso no
            cadastro de usuários.
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#16253E] to-[#0D1626] text-white">
      <AtualizadorApk />
      <PortariaAtendimentoMobile dark />
      <div
        className="mx-auto w-full max-w-md px-3 pb-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
