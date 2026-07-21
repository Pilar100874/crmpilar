import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { downloadApk } from "@/lib/downloadApk";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BASE = `${SUPABASE_URL}/functions/v1`;

const endpoints = [
  { m: "POST", path: "/tv-device-auth", body: `{ "codigo": "ABCD1234", "token": "<token do pareamento>" }`, resp: `{ "device_id": "...", "session_jwt": "eyJ...", "expires_in": 604800 }`, auth: "Público (usa código + token do QR)" },
  { m: "GET", path: "/tv-device-config", body: null, resp: `{ "device": {...}, "dashboard": {...}, "playlist": {...} }`, auth: "Header: x-device-token: <session_jwt>" },
  { m: "POST", path: "/tv-device-heartbeat", body: `{ "status": "online", "versao": "1.0.0", "memoria": 45.2, "cpu": 12.3, "armazenamento": 60.5, "uptime": 8600, "ip": "10.0.0.5", "resolucao": "1920x1080" }`, resp: `{ "ok": true }`, auth: "Header: x-device-token" },
  { m: "POST", path: "/tv-device-log", body: `{ "nivel": "info", "tipo": "render", "mensagem": "Dashboard carregado", "contexto": {} }`, resp: `{ "ok": true }`, auth: "Header: x-device-token" },
  { m: "GET", path: "/tv-device-commands", body: null, resp: `{ "commands": [{ "id": "...", "tipo": "reiniciar_app", "payload": {} }] }`, auth: "Header: x-device-token" },
  { m: "POST", path: "/tv-device-command-confirm", body: `{ "command_id": "...", "status": "confirmado", "resultado": {} }`, resp: `{ "ok": true }`, auth: "Header: x-device-token" },
];

export default function TvSignageApi() {
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/15 p-2.5">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">App Android TV / Google TV</h2>
              <p className="text-sm text-muted-foreground">
                Baixe o APK e instale na sua TV para exibir os dashboards em tela cheia.
                Aparelhos com câmera (Google TV, tablets, celulares Android) podem parear apenas
                <b> lendo o QR Code</b> — sem digitar nada. Nas TVs sem câmera, digite o código + token exibidos.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Versão 1.1.1 · ~27 MB · Android 7.0+ (API 24) · com leitor de QR embutido</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="lg"
              className="gap-2"
              onClick={() =>
                downloadApk(
                  "/__l5e/assets-v1/136d1f21-8b36-45d7-bc72-6b92c110da9c/pilar-tv-signage-v1.1.1.apk",
                  "pilar-tv-signage-v1.1.1.apk",
                )
              }
            >
              <Download className="w-4 h-4" /> Baixar APK
            </Button>
          </div>

        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div><b className="text-foreground">Como instalar:</b></div>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Nas configurações da TV, habilite <b>Fontes desconhecidas</b> (Segurança / Aplicativos).</li>
            <li>Baixe o APK diretamente pelo navegador da TV, envie por pendrive USB ou use <code>adb install pilar-tv-signage-v1.1.1.apk</code>.</li>
            <li>Abra <b>Pilar TV Signage</b> no launcher. <b>Se o aparelho tiver câmera</b>, toque em <b>📷 Ler QR Code</b> e aponte para o QR gerado em <b>Dispositivos → Novo</b> — o pareamento é automático. Caso contrário, digite o código de 8 caracteres + token.</li>
            <li>Pronto: a TV assume o dashboard/playlist configurado e recebe comandos remotos em tempo real.</li>
          </ol>

        </div>
      </Card>


      <Card className="p-4">
        <h2 className="font-medium mb-2">Como o app Android TV se conecta</h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Cadastre a TV em <b>Dispositivos → Novo</b>. Um QR Code aparecerá com <code>codigo</code>, <code>token</code> e <code>api_url</code>.</li>
          <li>O app lê o QR (ou o admin digita) e envia <code>POST /tv-device-auth</code> — recebe um <code>session_jwt</code>.</li>
          <li>O app guarda o JWT localmente e o envia em <b>toda</b> requisição no header <code>x-device-token</code>.</li>
          <li>Consulta <code>GET /tv-device-config</code> para descobrir qual dashboard/playlist exibir.</li>
          <li>Assina Supabase Realtime nas tabelas <code>tv_devices</code>, <code>tv_dashboards</code>, <code>tv_playlists</code>, <code>tv_commands</code> para receber alterações imediatas — ou faz polling em <code>GET /tv-device-commands</code>.</li>
          <li>Envia telemetria periódica via <code>POST /tv-device-heartbeat</code> (recomendado a cada 30s).</li>
        </ol>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Base URL</h2>
          <Button variant="outline" size="sm" onClick={() => copy(BASE)}><Copy className="w-3 h-3 mr-1" />Copiar</Button>
        </div>
        <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{BASE}</code>
      </Card>

      <div className="space-y-3">
        {endpoints.map((e) => (
          <Card key={e.path} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${e.m === "POST" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}`}>{e.m}</span>
              <code className="text-sm font-mono">{e.path}</code>
              <Button variant="ghost" size="icon" onClick={() => copy(`${BASE}${e.path}`)}><Copy className="w-3 h-3" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">🔐 {e.auth}</p>
            {e.body && <div className="mb-2"><div className="text-xs text-muted-foreground mb-1">Request body:</div><pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{e.body}</pre></div>}
            <div className="text-xs text-muted-foreground mb-1">Response:</div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{e.resp}</pre>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-medium mb-2">Realtime (Kotlin — Android TV)</h2>
        <p className="text-sm text-muted-foreground mb-2">Use o SDK oficial <code>io.github.jan-tennert.supabase:realtime-kt</code> para escutar alterações da própria TV:</p>
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{`supabase.channel("tv-\${deviceId}") {
  postgresChangeFlow<TvCommand>(schema = "public") {
    table = "tv_commands"
    filter("device_id", FilterOperator.EQ, deviceId)
  }.onEach { ... }.launchIn(scope)
}`}</pre>
        <a href="https://supabase.com/docs/reference/kotlin/introduction" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
          Docs Supabase Kotlin <ExternalLink className="w-3 h-3" />
        </a>
      </Card>
    </div>
  );
}
