// Modo Totem: tela cheia para tablet/quiosque em parede.
// Mostra QR code rotativo grande + relógio + nome da filial. Sem menus.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSearchParams } from "react-router-dom";
import { Maximize2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ROTATE_MS = 15000;

export default function PontoTotem() {
  const [params] = useSearchParams();
  const filialId = params.get("filial") || "";
  const [filialNome, setFilialNome] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [secs, setSecs] = useState<number>(ROTATE_MS / 1000);
  const [now, setNow] = useState<Date>(new Date());
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    if (!filialId) return;
    supabase.from("ponto_filiais").select("nome").eq("id", filialId).maybeSingle()
      .then(({ data }) => setFilialNome((data as any)?.nome || ""));
  }, [filialId]);

  const gerar = async () => {
    if (!filialId) return;
    try {
      const { data, error } = await supabase.functions.invoke("ponto-qrcode-token", {
        body: { filial_id: filialId },
      });
      if (error) throw error;
      const t = (data as any)?.token || "";
      const url = `${window.location.origin}/ponto/registro?qr=${t}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 520, margin: 1 });
      setQr(dataUrl);
      setSecs(ROTATE_MS / 1000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!filialId) return;
    gerar();
    const a = setInterval(gerar, ROTATE_MS);
    const b = setInterval(() => setSecs((s) => (s > 1 ? s - 1 : ROTATE_MS / 1000)), 1000);
    const c = setInterval(() => setNow(new Date()), 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(a); clearInterval(b); clearInterval(c);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [filialId]);

  const entrarFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!filialId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Modo Totem</h1>
          <p className="text-muted-foreground">
            Acesse <code>/ponto/totem?filial=ID_DA_FILIAL</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <div className="text-3xl font-bold">{filialNome || "Totem de Ponto"}</div>
          <div className="text-slate-400 text-sm">Aponte a câmera do celular ao QR Code</div>
        </div>
        <div className="flex items-center gap-3">
          {!online && (
            <div className="flex items-center gap-2 bg-orange-600/30 border border-orange-500 rounded-md px-3 py-1.5">
              <WifiOff className="h-4 w-4" /> <span className="text-sm">Sem rede</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={entrarFullscreen} className="text-white hover:bg-white/10">
            <Maximize2 className="h-4 w-4 mr-2" /> Tela cheia
          </Button>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 p-6">
        {/* Relógio */}
        <div className="text-center">
          <div className="text-7xl lg:text-9xl font-mono font-bold tabular-nums">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-2xl text-slate-400 mt-4 capitalize">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        {/* QR */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            {qr ? (
              <img src={qr} alt="QR" className="w-[420px] h-[420px]" />
            ) : (
              <div className="w-[420px] h-[420px] bg-slate-200 animate-pulse rounded" />
            )}
          </div>
          <div className="text-lg text-slate-300">
            Renova em <span className="font-bold text-white tabular-nums">{secs}s</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 pb-4">
        Pilar Ponto · Marcação válida com selfie + GPS · Códigos expiram em 15s
      </div>
    </div>
  );
}
