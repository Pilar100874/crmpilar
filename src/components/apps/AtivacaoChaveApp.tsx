import { useCallback, useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AppComChave = "fone" | "sms" | "automacao" | "remotas";

export type AtivacaoSalva = {
  chave: string;
  empresa: string;
  estabelecimento_id: string;
};

const storageKey = (app: AppComChave) => `pilar_ativacao_${app}`;

function ler(app: AppComChave): AtivacaoSalva | null {
  try {
    const bruto = localStorage.getItem(storageKey(app));
    return bruto ? (JSON.parse(bruto) as AtivacaoSalva) : null;
  } catch {
    return null;
  }
}

/** Guarda e valida a chave que identifica a empresa dona do aparelho. */
export function useAtivacaoChave(app: AppComChave) {
  const [ativacao, setAtivacao] = useState<AtivacaoSalva | null | undefined>(undefined);

  useEffect(() => {
    setAtivacao(ler(app));
  }, [app]);

  const salvar = useCallback(
    (dados: AtivacaoSalva) => {
      localStorage.setItem(storageKey(app), JSON.stringify(dados));
      setAtivacao(dados);
    },
    [app],
  );

  const limpar = useCallback(() => {
    localStorage.removeItem(storageKey(app));
    setAtivacao(null);
  }, [app]);

  return { ativacao, salvar, limpar };
}

export default function AtivacaoChaveApp({
  app,
  titulo,
  subtitulo,
  logo,
  onAtivado,
}: {
  app: AppComChave;
  titulo: string;
  subtitulo?: string;
  logo?: string;
  onAtivado: (dados: AtivacaoSalva) => void;
}) {
  const [chave, setChave] = useState("");
  const [validando, setValidando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const validar = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidando(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("app-chave-validar", {
      body: { chave: chave.trim().toUpperCase(), app },
    });
    setValidando(false);

    const resposta = data as
      | { estabelecimento_id?: string; empresa?: string; error?: string }
      | null;
    if (error || !resposta?.estabelecimento_id) {
      setErro(resposta?.error ?? "Chave inválida. Confira com o administrador.");
      return;
    }
    onAtivado({
      chave: chave.trim().toUpperCase(),
      empresa: resposta.empresa ?? "",
      estabelecimento_id: resposta.estabelecimento_id,
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#16253E] to-[#0D1626] p-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {logo ? (
            <img src={logo} alt={titulo} className="h-14 w-auto object-contain drop-shadow" />
          ) : (
            <KeyRound className="h-10 w-10 text-orange-500" />
          )}
          <div className="h-1 w-16 rounded-full bg-orange-500" />
          <div>
            <h1 className="text-lg font-semibold text-white">{titulo}</h1>
            <p className="text-xs text-slate-400">{subtitulo ?? "Ativação do aparelho"}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={validar}>
          <div className="space-y-1.5">
            <Label htmlFor="chave" className="text-slate-300">
              Chave da empresa
            </Label>
            <Input
              id="chave"
              value={chave}
              onChange={(e) => setChave(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect="off"
              required
              placeholder="XXXX-XXXX"
              className="border-white/10 bg-white/10 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-500 focus-visible:ring-orange-500"
            />
          </div>
          {erro && <p className="text-sm text-red-400">{erro}</p>}
          <Button
            type="submit"
            disabled={validando}
            className="w-full bg-orange-500 font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
          >
            {validando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar aparelho"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          A chave é gerada pelo administrador em Admin → Apps.
        </p>
      </div>
    </div>
  );
}
