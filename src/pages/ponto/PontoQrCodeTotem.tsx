import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { QrCode as QrCodeIcon } from "lucide-react";

const ROTATE_MS = 15000;

export default function PontoQrCodeTotem() {
  const { empresaId } = usePontoEmpresa();
  const [filiais, setFiliais] = useState<any[]>([]);
  const [filialId, setFilialId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [secs, setSecs] = useState<number>(ROTATE_MS / 1000);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId)
      .then(({ data }) => {
        setFiliais(data || []);
        if (data?.[0] && !filialId) setFilialId(data[0].id);
      });
  }, [empresaId]);

  const gerar = async () => {
    if (!filialId) return;
    try {
      const { data, error } = await supabase.functions.invoke("ponto-qrcode-token", {
        body: { filial_id: filialId },
      });
      if (error) throw error;
      const t = data?.token || "";
      setToken(t);
      const url = `${window.location.origin}/ponto/registro?qr=${t}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 });
      setQr(dataUrl);
      setSecs(ROTATE_MS / 1000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!filialId) return;
    gerar();
    const interval = setInterval(gerar, ROTATE_MS);
    const tick = setInterval(() => setSecs((s) => (s > 1 ? s - 1 : ROTATE_MS / 1000)), 1000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [filialId]);

  const filial = filiais.find((f) => f.id === filialId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCodeIcon className="h-6 w-6" /> QR Code do Totem
          </h1>
          <p className="text-muted-foreground text-sm">
            Aponte o celular para registrar ponto. Código renova a cada 15s.
          </p>
        </div>
        <div className="w-64">
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
            <SelectContent>
              {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-10 flex flex-col items-center gap-6">
        {filial && <div className="text-xl font-semibold">{filial.nome}</div>}
        {qr ? (
          <img src={qr} alt="QR" className="rounded-lg border" />
        ) : (
          <div className="h-[320px] w-[320px] bg-muted animate-pulse rounded" />
        )}
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Renova em {secs}s</Badge>
          {token && (
            <code className="text-xs text-muted-foreground">
              {token.slice(0, 8)}…
            </code>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          O funcionário escaneia o código e bate o ponto com selfie + GPS.
          Códigos vencem em 15 segundos para impedir captura/reuso.
        </p>
      </Card>
    </div>
  );
}
