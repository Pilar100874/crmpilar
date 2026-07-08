// Catálogo de modelos de câmera por marca com capacidades conhecidas.
// Selecionar um modelo autopreenche: porta, protocolo, snapshot_path,
// onvif_porta, tem_ptz, tem_audio — evitando erro humano.
//
// Fontes: datasheets oficiais dos fabricantes + documentação ONVIF pública.
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
  { value: "c100",   label: "Tapo C100 (fixa interna)",        tem_ptz: false, tem_audio: false, onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c110",   label: "Tapo C110 (fixa interna)",        tem_ptz: false, tem_audio: false, onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c120",   label: "Tapo C120 (fixa in/out)",         tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c125",   label: "Tapo C125 (2K AI interna)",       tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c200",   label: "Tapo C200 (PTZ interna)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c210",   label: "Tapo C210 (PTZ 2K)",              tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c211",   label: "Tapo C211 (PTZ 2K)",              tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c212",   label: "Tapo C212 (PTZ 2K AI)",           tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c220",   label: "Tapo C220 (PTZ 2K AI)",           tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c225",   label: "Tapo C225 (PTZ 2K QHD)",          tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c310",   label: "Tapo C310 (bullet outdoor)",      tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c320ws", label: "Tapo C320WS (bullet 2K outdoor)", tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c325wb", label: "Tapo C325WB (color night)",       tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c340",   label: "Tapo C340 (2K color outdoor)",    tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c400",   label: "Tapo C400 (bateria)",             tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c420",   label: "Tapo C420 (bateria 2K)",          tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c425",   label: "Tapo C425 (bateria 2K color)",    tem_ptz: false, tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c500",   label: "Tapo C500 (PTZ outdoor)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c510w",  label: "Tapo C510W (PTZ outdoor 2K)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c520ws", label: "Tapo C520WS (PTZ outdoor color)", tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
  { value: "c720",   label: "Tapo C720 (PTZ 4MP AI)",          tem_ptz: true,  tem_audio: true,  onvif_porta: 2020, porta: 554, protocolo: "rtsp", snapshot_path: "/stream1" },
];

// Hikvision — HTTP porta 80, ONVIF porta 80 (padrão) ou 8000 em alguns modelos.
const HIKVISION: CameraModelSpec[] = [
  { value: "ds2cd1023",   label: "DS-2CD1023G0E-I (bullet 2MP)",    tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd1043",   label: "DS-2CD1043G0-I (bullet 4MP)",     tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd1063",   label: "DS-2CD1063G0-I (bullet 6MP)",     tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd1143",   label: "DS-2CD1143G0-I (dome 4MP)",       tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2023",   label: "DS-2CD2023G2-I (bullet 2MP Acu)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2043",   label: "DS-2CD2043G2-I (bullet 4MP Acu)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2063",   label: "DS-2CD2063G2-I (bullet 6MP Acu)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2083",   label: "DS-2CD2083G2-I (bullet 8MP Acu)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2143",   label: "DS-2CD2143G2-I (dome 4MP Acu)",   tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2183",   label: "DS-2CD2183G2-I (dome 8MP Acu)",   tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2347",   label: "DS-2CD2347G2-LU (ColorVu 4MP)",   tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2387",   label: "DS-2CD2387G2-LU (ColorVu 8MP)",   tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2cd2547",   label: "DS-2CD2547G2-LS (ColorVu turret)",tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de3a404",  label: "DS-2DE3A404IW-DE (mini PTZ)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de4a425",  label: "DS-2DE4A425IW-DE (PTZ 4MP 25x)",  tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de5425",   label: "DS-2DE5425IW-AE (Speed Dome)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2de7a425",  label: "DS-2DE7A425IW (PTZ 4MP 25x)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
  { value: "ds2df8836",   label: "DS-2DF8836IX (PTZ 8MP 36x)",      tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/ISAPI/Streaming/channels/101/picture" },
];

// Intelbras — HTTP porta 80, ONVIF porta 80.
const INTELBRAS: CameraModelSpec[] = [
  { value: "vip1130b",  label: "VIP 1130 B (bullet 1MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1130d",  label: "VIP 1130 D (dome 1MP)",           tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1230b",  label: "VIP 1230 B (bullet 2MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1230d",  label: "VIP 1230 D (dome 2MP)",           tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1430b",  label: "VIP 1430 B (bullet 4MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip1430d",  label: "VIP 1430 D (dome 4MP)",           tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3230b",  label: "VIP 3230 B (bullet 2MP IA)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3230d",  label: "VIP 3230 D (dome 2MP IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3230sl", label: "VIP 3230 SL (LPR placas)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3430b",  label: "VIP 3430 B (bullet 4MP IA)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip3430d",  label: "VIP 3430 D (dome 4MP IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip5450z",  label: "VIP 5450 Z (motorizada zoom)",    tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vip9450",   label: "VIP 9450 (Fisheye 360°)",         tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im3",       label: "iM3 (Mibo cube WiFi)",            tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im4c",      label: "iM4 C (Mibo PT WiFi)",            tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im5c",      label: "iM5 C (Mibo PT 2K)",              tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "im7",       label: "iM7 (Mibo bullet WiFi)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vipsd4225", label: "VIP SD 4225 IA (Speed Dome PTZ)", tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vipsd9x25", label: "VIP SD 9x25 (Speed Dome 25x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "vipsd9x40", label: "VIP SD 9x40 (Speed Dome 40x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

// Dahua — HTTP porta 80, ONVIF porta 80. Snapshot cgi-bin (mesmo padrão da Intelbras que é OEM Dahua).
const DAHUA: CameraModelSpec[] = [
  { value: "hfw1230s",  label: "IPC-HFW1230S (bullet 2MP)",       tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hfw1431s",  label: "IPC-HFW1431S (bullet 4MP)",       tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hdw1431s",  label: "IPC-HDW1431S (dome 4MP)",         tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hfw2431t",  label: "IPC-HFW2431T-AS (bullet 4MP IA)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hfw3441t",  label: "IPC-HFW3441T-AS (bullet 4MP AI)", tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hdw3441t",  label: "IPC-HDW3441T-AS (dome 4MP AI)",   tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "hfw5241e",  label: "IPC-HFW5241E-Z12E (LPR)",         tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "sd49225",   label: "SD49225XA-HNR (PTZ 25x)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "sd6ae245",  label: "SD6AE245XA-HNR (PTZ 45x AI)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ebw81242",  label: "IPC-EBW81242 (Fisheye 12MP)",     tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

// Reolink — RTSP porta 554, ONVIF porta 8000 (série RLC/E).
const REOLINK: CameraModelSpec[] = [
  { value: "rlc410",    label: "RLC-410 (bullet 5MP)",           tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc510a",   label: "RLC-510A (bullet 5MP IA)",       tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc520a",   label: "RLC-520A (dome 5MP IA)",         tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc810a",   label: "RLC-810A (bullet 4K IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc811a",   label: "RLC-811A (bullet 4K zoom 5x)",   tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc820a",   label: "RLC-820A (dome 4K IA)",          tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "rlc823a",   label: "RLC-823A (PTZ 4K 16x)",          tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "e1",        label: "E1 (PT interna)",                tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "e1pro",     label: "E1 Pro (PT 4MP)",                tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "e1zoom",    label: "E1 Zoom (PTZ 5MP 3x)",           tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "e1outdoor", label: "E1 Outdoor (PT 4K)",             tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
  { value: "trackmix",  label: "TrackMix (PTZ dual 4K)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/h264Preview_01_main" },
];

// Amcrest — HTTP porta 80, ONVIF porta 80. Snapshot Dahua-like.
const AMCREST: CameraModelSpec[] = [
  { value: "ip2m841",   label: "IP2M-841 (PT 2MP interna)",      tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ip3m943",   label: "IP3M-943 (dome 3MP)",            tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ip4m1051",  label: "IP4M-1051 (bullet 4MP)",         tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ip5m1190",  label: "IP5M-1190 (bullet 5MP)",         tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ip8m2597",  label: "IP8M-2597 (bullet 4K)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ip8mt2549", label: "IP8M-T2599 (dome 4K)",           tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

// EZVIZ (Hikvision) — RTSP porta 554, ONVIF porta 8000. Requer ativar RTSP no app.
const EZVIZ: CameraModelSpec[] = [
  { value: "c1c",   label: "C1C (cube interna)",              tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c3n",   label: "C3N (bullet outdoor)",            tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c3w",   label: "C3W (bullet outdoor color)",      tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c3x",   label: "C3X (dual lens outdoor)",         tem_ptz: false, tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c6n",   label: "C6N (PT interna)",                tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c6cn",  label: "C6CN (PT 2MP)",                   tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c8c",   label: "C8C (PT outdoor 2K)",             tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "c8pf",  label: "C8PF (PTZ dual outdoor)",         tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
  { value: "h8pro", label: "H8 Pro (PT 3MP color night)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 8000, porta: 554, protocolo: "rtsp", snapshot_path: "/Streaming/Channels/101" },
];

// Foscam — RTSP porta 88 (HD) ou 554, ONVIF porta 888/8000.
const FOSCAM: CameraModelSpec[] = [
  { value: "r2m",    label: "R2M (PT 2MP interna)",           tem_ptz: true,  tem_audio: true,  onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
  { value: "r4m",    label: "R4M (PT 4MP interna)",           tem_ptz: true,  tem_audio: true,  onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
  { value: "sd2x",   label: "SD2X (PTZ 2MP zoom 18x)",        tem_ptz: true,  tem_audio: true,  onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
  { value: "sd4",    label: "SD4 (PTZ 4MP zoom 4x)",          tem_ptz: true,  tem_audio: true,  onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
  { value: "fi9902", label: "FI9902P (bullet 2MP outdoor)",   tem_ptz: false, tem_audio: false, onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
  { value: "v5ep",   label: "V5EP (bullet 5MP outdoor)",      tem_ptz: false, tem_audio: true,  onvif_porta: 888, porta: 88,  protocolo: "rtsp", snapshot_path: "/videoMain" },
];

// Axis — HTTP porta 80, ONVIF porta 80. Snapshot VAPIX.
const AXIS: CameraModelSpec[] = [
  { value: "m3045",  label: "AXIS M3045-V (dome interna)",       tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "m3057",  label: "AXIS M3057-PLVE (Fisheye 6MP)",     tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "m3067",  label: "AXIS M3067-P (Panoramic)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "p1375",  label: "AXIS P1375 (box 2MP)",              tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "p1455",  label: "AXIS P1455-LE (bullet)",            tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "p3245",  label: "AXIS P3245-LV (dome IA)",           tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "p5655",  label: "AXIS P5655-E (PTZ 32x)",            tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
  { value: "q6135",  label: "AXIS Q6135-LE (PTZ HDTV 1080p 32x)",tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/axis-cgi/jpg/image.cgi" },
];

// Uniview (UNV) — HTTP porta 80, ONVIF porta 80.
const UNIVIEW: CameraModelSpec[] = [
  { value: "ipc2122",  label: "IPC2122LR3-PF40M (bullet 2MP)",  tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc2124",  label: "IPC2124SR3-DPF (bullet 4MP)",    tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc3612",  label: "IPC3612LR3 (dome 2MP)",          tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc3614",  label: "IPC3614SR3 (dome 4MP)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc3618",  label: "IPC3618SR3 (dome 8MP)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc6222",  label: "IPC6222ER-X20 (PTZ 2MP 20x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "ipc6252",  label: "IPC6252SR-X22 (PTZ 4MP 22x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

// Vivotek — HTTP porta 80, ONVIF porta 80.
const VIVOTEK: CameraModelSpec[] = [
  { value: "ib9389",  label: "IB9389-H (bullet 5MP)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/viewer/video.jpg" },
  { value: "fd9189",  label: "FD9189-H (dome 5MP)",            tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/viewer/video.jpg" },
  { value: "fd9365",  label: "FD9365-HTV (dome 2MP)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/viewer/video.jpg" },
  { value: "sd9384",  label: "SD9384-EHL (Speed Dome 30x)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/viewer/video.jpg" },
];

// Bosch — HTTP porta 80, ONVIF porta 80.
const BOSCH: CameraModelSpec[] = [
  { value: "dinion3000", label: "Dinion IP 3000i (bullet)",     tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/snap.jpg" },
  { value: "flexidome4000", label: "Flexidome IP 4000i",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/snap.jpg" },
  { value: "autodome5000", label: "Autodome IP 5000i (PTZ)",    tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/snap.jpg" },
];

// D-Link — RTSP porta 554, ONVIF porta 80.
const DLINK: CameraModelSpec[] = [
  { value: "dcs8000lh", label: "DCS-8000LH (mini interna)",     tem_ptz: false, tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live1.sdp" },
  { value: "dcs8300lh", label: "DCS-8300LH (interna 2MP)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live1.sdp" },
  { value: "dcs8302lh", label: "DCS-8302LH (outdoor 2MP)",      tem_ptz: false, tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live1.sdp" },
  { value: "dcs8526lh", label: "DCS-8526LH (PT interna 2MP)",   tem_ptz: true,  tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live1.sdp" },
];

// Giga Security — HTTP porta 80, ONVIF porta 80 (similar Dahua/Intelbras OEM).
const GIGA: CameraModelSpec[] = [
  { value: "gsip2m",   label: "GS0480 (bullet 2MP)",           tem_ptz: false, tem_audio: false, onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "gsip4m",   label: "GS0483 (bullet 4MP IA)",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "gsip4md",  label: "GS0484 (dome 4MP IA)",          tem_ptz: false, tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
  { value: "gsipsd",   label: "GS0491 (Speed Dome 25x)",       tem_ptz: true,  tem_audio: true,  onvif_porta: 80, snapshot_path: "/cgi-bin/snapshot.cgi" },
];

// Multilaser — RTSP porta 554, ONVIF porta 80. Linhas SE/Liv.
const MULTILASER: CameraModelSpec[] = [
  { value: "se221",  label: "Liv SE221 (interna PT 1080p)",     tem_ptz: true,  tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/onvif1" },
  { value: "se222",  label: "Liv SE222 (bullet outdoor)",       tem_ptz: false, tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/onvif1" },
  { value: "se224",  label: "Liv SE224 (PT interna 2K)",        tem_ptz: true,  tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/onvif1" },
];

// Positivo Casa Inteligente — RTSP porta 554, ONVIF porta 80.
const POSITIVO: CameraModelSpec[] = [
  { value: "smartcam", label: "Smart Câmera (PT interna)",      tem_ptz: true,  tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live/ch00_0" },
  { value: "smartcam360", label: "Smart Câmera 360",            tem_ptz: true,  tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live/ch00_0" },
  { value: "smartcamout", label: "Smart Câmera Externa",        tem_ptz: false, tem_audio: true,  onvif_porta: 80, porta: 554, protocolo: "rtsp", snapshot_path: "/live/ch00_0" },
];

// Xiaomi / Mi Home — normalmente exigem hack de firmware para ONVIF/RTSP. Mantido genérico.
const XIAOMI: CameraModelSpec[] = [
  { value: "mihomec300",  label: "Mi Home Security C300 (PT 2K)",     tem_ptz: true,  tem_audio: true, onvif_porta: 8899, porta: 554, protocolo: "rtsp", snapshot_path: "/live/ch00_0", observacao: "Exige firmware customizado (Xiaomi/Mi Home padrão não expõe ONVIF)" },
  { value: "mihomec400",  label: "Mi Home Security C400 (PTZ outdoor)",tem_ptz: true,  tem_audio: true, onvif_porta: 8899, porta: 554, protocolo: "rtsp", snapshot_path: "/live/ch00_0", observacao: "Requer plugin ONVIF de terceiros" },
];

export const CAMERA_MODELS: Record<string, CameraModelSpec[]> = {
  tplink_tapo: TAPO,
  hikvision: HIKVISION,
  intelbras: INTELBRAS,
  dahua: DAHUA,
  reolink: REOLINK,
  amcrest: AMCREST,
  ezviz: EZVIZ,
  foscam: FOSCAM,
  axis: AXIS,
  uniview: UNIVIEW,
  vivotek: VIVOTEK,
  bosch: BOSCH,
  dlink: DLINK,
  giga: GIGA,
  multilaser: MULTILASER,
  positivo: POSITIVO,
  xiaomi: XIAOMI,
  generica_http: [],
  generica_rtsp: [],
  generica_onvif: [],
};

export function findModel(marca: string, modelo: string | null | undefined): CameraModelSpec | null {
  if (!modelo) return null;
  const list = CAMERA_MODELS[marca] || [];
  return list.find((m) => m.value === modelo) ?? null;
}
