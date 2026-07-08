// Catálogo de modelos de câmera por marca com capacidades conhecidas.
// Selecionar um modelo autopreenche: porta, protocolo, snapshot_path,
// onvif_porta, tem_ptz, tem_audio — evitando erro humano.
//
// Fontes: datasheets oficiais TP-Link Tapo, Hikvision e Intelbras.
// Quando o modelo exato não estiver na lista, o usuário mantém "Genérico"
// e configura manualmente.

export type CameraModelSpec = {
  value: string;         // slug único dentro da marca
  label: string;         // nome exibido
  tem_ptz: boolean;      // motorizada (pan/tilt)
  tem_audio: boolean;    // áudio bidirecional
  onvif_porta: number;   // porta ONVIF do fabricante
  porta?: number;        // porta principal (RTSP/HTTP) — override do default da marca
  protocolo?: "rtsp" | "http" | "https";
  snapshot_path?: string;
  observacao?: string;   // dica curta exibida ao selecionar
};

// TP-Link Tapo — RTSP porta 554, ONVIF porta 2020, credencial local (Conta da Câmera).
const TAPO: CameraModelSpec[] = [
  { value: "c100",   label: "Tapo C100 (fixa interna)",       tem_ptz: false, tem_audio: false, onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c110",   label: "Tapo C110 (fixa interna)",       tem_ptz: false, tem_audio: false, onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c120",   label: "Tapo C120 (fixa in/out)",        tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c200",   label: "Tapo C200 (PTZ interna)",        tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c210",   label: "Tapo C210 (PTZ 2K)",             tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c220",   label: "Tapo C220 (PTZ 2K AI)",          tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c225",   label: "Tapo C225 (PTZ 2K QHD)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c310",   label: "Tapo C310 (bullet outdoor)",     tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c320ws", label: "Tapo C320WS (bullet 2K outdoor)",tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c325wb", label: "Tapo C325WB (color night)",      tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c400",   label: "Tapo C400 (bateria)",            tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c420",   label: "Tapo C420 (bateria 2K)",         tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c500",   label: "Tapo C500 (PTZ outdoor)",        tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c510w",  label: "Tapo C510W (PTZ outdoor 2K)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c520ws", label: "Tapo C520WS (PTZ outdoor color)",tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c720",   label: "Tapo C720 (PTZ 4MP AI)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
];

// Hikvision — HTTP porta 80, ONVIF porta 80 (padrão) ou 8000 em alguns modelos.
const HIKVISION: CameraModelSpec[] = [
  { value: "ds2cd1023",   label: "DS-2CD1023G0E-I (bullet 2MP)",   tem_ptz: false, tem_audio: false, onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd1043",   label: "DS-2CD1043G0-I (bullet 4MP)",    tem_ptz: false, tem_audio: false, onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd1143",   label: "DS-2CD1143G0-I (dome 4MP)",      tem_ptz: false, tem_audio: false, onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2043",   label: "DS-2CD2043G2-I (bullet 4MP Acu)",tem_ptz: false, tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2143",   label: "DS-2CD2143G2-I (dome 4MP Acu)",  tem_ptz: false, tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de3a404",  label: "DS-2DE3A404IW-DE (mini PTZ)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de4a425",  label: "DS-2DE4A425IW-DE (PTZ 4MP 25x)", tem_ptz: true,  tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de5425",   label: "DS-2DE5425IW-AE (Speed Dome)",   tem_ptz: true,  tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2df8836",   label: "DS-2DF8836IX (PTZ 8MP 36x)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 80,   snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
];

// Intelbras — HTTP porta 80, ONVIF porta 80.
const INTELBRAS: CameraModelSpec[] = [
  { value: "vip1230b",  label: "VIP 1230 B (bullet 2MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1230d",  label: "VIP 1230 D (dome 2MP)",           tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1430b",  label: "VIP 1430 B (bullet 4MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3230b",  label: "VIP 3230 B (bullet 2MP IA)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3230d",  label: "VIP 3230 D (dome 2MP IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3430b",  label: "VIP 3430 B (bullet 4MP IA)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3430d",  label: "VIP 3430 D (dome 4MP IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip5450z",  label: "VIP 5450 Z (motorizada zoom)",    tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im3", label: "iM3 (Mibo cube WiFi)",                  tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im4c",label: "iM4 C (Mibo PT WiFi)",                  tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im5c",label: "iM5 C (Mibo PT 2K)",                    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vipsd4225", label: "VIP SD 4225 IA (Speed Dome PTZ)", tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vipsd9x25", label: "VIP SD 9x25 (Speed Dome 25x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

export const CAMERA_MODELS: Record<string, CameraModelSpec[]> = {
  tplink_tapo: TAPO,
  hikvision: HIKVISION,
  intelbras: INTELBRAS,
  generica_http: [],
  generica_rtsp: [],
};

export function findModel(marca: string, modelo: string | null | undefined): CameraModelSpec | null {
  if (!modelo) return null;
  const list = CAMERA_MODELS[marca] || [];
  return list.find((m) => m.value === modelo) ?? null;
}
