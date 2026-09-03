import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle, CheckCircle2, Download, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APP_VERSAO,
  verificarAtualizacao,
  type VersaoRemota,
} from "@/lib/portaria/appVersao";
import { lerConfigSip } from "@/lib/portaria/sipConfig";
import { salvarConfigNaNuvem } from "@/lib/portaria/sipConfigCloud";

/**
 * Atualização remota do APK Pilar Sip.
 * Antes de baixar a nova versão faz o backup das configurações do ramal na
 * nuvem, então nada é perdido ao instalar por cima.
 */
export default function AtualizadorApk({ compacto = false }: { compacto?: boolean }) {
  const [nova, setNova] = useState<VersaoRemota | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [dispensada, setDispensada] = useState<string | null>(null);
  const [semAtualizacao, setSemAtualizacao] = useState(false);

  const checar = useCallback(async (manual = false) => {
    setVerificando(true);
    setSemAtualizacao(false);
    const r = await verificarAtualizacao();
    setNova(r);
    if (manual && !r) setSemAtualizacao(true);
    setVerificando(false);
  }, []);

  useEffect(() => {
    void checar();
    const t = setInterval(() => void checar(), 6 * 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [checar]);

  const atualizar = async () => {
    if (!nova) return;
    setBaixando(true);
    // Backup das configurações antes de instalar a nova versão.
    await salvarConfigNaNuvem(lerConfigSip());
    window.open(nova.downloadUrl, "_blank", "noopener");
    setBaixando(false);
  };

  if (compacto) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#8696A0]">
        <span>
          Versão {APP_VERSAO}
          {nova && <span className="ml-2 font-semibold text-[#00A884]">nova {nova.version}</span>}
          {semAtualizacao && !nova && (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> atualizado
            </span>
          )}
        </span>
        {nova ? (
          <Button
            size="sm"
            className="h-7 rounded-lg bg-[#00A884] px-3 text-xs font-semibold text-white hover:bg-[#019a79]"
            onClick={atualizar}
            disabled={baixando}
          >
            {baixando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span className="ml-1">Atualizar</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2 text-xs text-[#8696A0] hover:bg-white/10 hover:text-white"
            onClick={() => void checar(true)}
            disabled={verificando}
          >
            {verificando ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1">Verificar</span>
          </Button>
        )}
      </div>
    );
  }

  if (!nova || dispensada === nova.version) return null;

  return (
    <div
      className="sticky top-0 z-50 border-b border-[#00A884]/30 bg-[#0F2A24] px-4 py-3 text-[#E9EDEF]"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div className="mx-auto flex w-full max-w-md items-start gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#00A884]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Atualização disponível ({nova.version})</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[#8696A0]">
            {nova.notas || "Nova versão do Pilar Sip."} Suas configurações do ramal são salvas antes
            da instalação.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="h-8 rounded-lg bg-[#00A884] px-3 text-xs font-semibold text-white hover:bg-[#019a79]"
              onClick={atualizar}
              disabled={baixando}
            >
              {baixando ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1 h-3.5 w-3.5" />
              )}
              Atualizar agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg px-3 text-xs text-[#8696A0] hover:bg-white/10 hover:text-white"
              onClick={() => setDispensada(nova.version)}
            >
              Depois
            </Button>
          </div>
        </div>
        <button
          aria-label="Fechar aviso de atualização"
          className="rounded-md p-1 text-[#8696A0] hover:bg-white/10 hover:text-white"
          onClick={() => setDispensada(nova.version)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
