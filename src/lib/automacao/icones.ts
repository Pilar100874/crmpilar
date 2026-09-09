// Biblioteca de ícones e animações para os blocos de Automação.
import {
  Lightbulb, LampDesk, LampCeiling, LampFloor, Lamp, Plug, PlugZap, Power, Zap, ZapOff,
  DoorOpen, DoorClosed, Fan, AirVent, Thermometer, ThermometerSun, ThermometerSnowflake,
  Droplet, Droplets, Waves, Flame, Snowflake, Sun, Moon, SunMoon, CloudRain, Cloud,
  Wind, Gauge, Activity, Radio, Wifi, WifiOff, Bell, BellRing, Siren, ShieldCheck, Shield,
  Lock, Unlock, KeyRound, Camera, Video, Monitor, Tv, Speaker, Volume2, VolumeX, Music,
  Play, Pause, Bath, ShowerHead, Refrigerator, Microwave, WashingMachine, CookingPot,
  Utensils, Coffee, Bed, Sofa, Armchair, Blinds, Curtains, Home, Building2, Warehouse,
  Car, CarFront, Bike, ParkingCircle, Fence, TreePine, Flower2, Sprout, Leaf,
  Battery, BatteryCharging, PlugZap2, SunSnow, Timer, AlarmClock, Clock, CalendarClock,
  Footprints, PersonStanding, ScanFace, Fingerprint, Eye, EyeOff, MapPin, Route,
  Cpu, Server, HardDrive, Router, Smartphone, Tablet, Laptop, Printer, Wrench, Settings,
  ToggleLeft, ToggleRight, CircleDot, Sparkles, Star, Heart, Rocket, Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const BIBLIOTECA_ICONES: Record<string, LucideIcon> = {
  Lightbulb, LampDesk, LampCeiling, LampFloor, Lamp, Plug, PlugZap, PlugZap2, Power, Zap, ZapOff,
  DoorOpen, DoorClosed, Fan, AirVent, Thermometer, ThermometerSun, ThermometerSnowflake,
  Droplet, Droplets, Waves, Flame, Snowflake, Sun, Moon, SunMoon, SunSnow, CloudRain, Cloud,
  Wind, Gauge, Activity, Radio, Wifi, WifiOff, Bell, BellRing, Siren, ShieldCheck, Shield,
  Lock, Unlock, KeyRound, Camera, Video, Monitor, Tv, Speaker, Volume2, VolumeX, Music,
  Play, Pause, Bath, ShowerHead, Refrigerator, Microwave, WashingMachine, CookingPot,
  Utensils, Coffee, Bed, Sofa, Armchair, Blinds, Curtains, Home, Building2, Warehouse,
  Car, CarFront, Bike, ParkingCircle, Fence, TreePine, Flower2, Sprout, Leaf,
  Battery, BatteryCharging, Timer, AlarmClock, Clock, CalendarClock,
  Footprints, PersonStanding, ScanFace, Fingerprint, Eye, EyeOff, MapPin, Route,
  Cpu, Server, HardDrive, Router, Smartphone, Tablet, Laptop, Printer, Wrench, Settings,
  ToggleLeft, ToggleRight, CircleDot, Sparkles, Star, Heart, Rocket, Bot,
};

/** Nomes em português para facilitar a busca do usuário. */
export const APELIDOS_ICONES: Record<string, string> = {
  Lightbulb: "lâmpada luz", LampDesk: "abajur luminária mesa", LampCeiling: "lustre teto",
  LampFloor: "luminária chão", Lamp: "lâmpada abajur", Plug: "tomada", PlugZap: "tomada energia",
  PlugZap2: "tomada energia", Power: "liga desliga", Zap: "energia raio", ZapOff: "sem energia",
  DoorOpen: "porta aberta", DoorClosed: "porta fechada", Fan: "ventilador", AirVent: "ar condicionado",
  Thermometer: "temperatura", ThermometerSun: "calor", ThermometerSnowflake: "frio",
  Droplet: "água gota", Droplets: "umidade água", Waves: "piscina água", Flame: "fogo aquecedor",
  Snowflake: "frio gelo", Sun: "sol dia", Moon: "noite", SunMoon: "dia noite", SunSnow: "clima",
  CloudRain: "chuva", Cloud: "nuvem", Wind: "vento", Gauge: "medidor consumo", Activity: "sensor",
  Radio: "sinal", Wifi: "wifi rede", WifiOff: "sem rede", Bell: "campainha", BellRing: "campainha tocando",
  Siren: "alarme sirene", ShieldCheck: "alarme ativo", Shield: "segurança", Lock: "trancado",
  Unlock: "destrancado", KeyRound: "chave", Camera: "câmera", Video: "vídeo", Monitor: "monitor",
  Tv: "televisão", Speaker: "caixa som", Volume2: "som", VolumeX: "mudo", Music: "música",
  Play: "tocar", Pause: "pausar", Bath: "banheira", ShowerHead: "chuveiro", Refrigerator: "geladeira",
  Microwave: "micro-ondas", WashingMachine: "máquina lavar", CookingPot: "fogão panela",
  Utensils: "cozinha", Coffee: "cafeteira", Bed: "quarto cama", Sofa: "sala sofá", Armchair: "poltrona",
  Blinds: "persiana", Curtains: "cortina", Home: "casa", Building2: "prédio", Warehouse: "galpão",
  Car: "carro", CarFront: "veículo", Bike: "bicicleta", ParkingCircle: "estacionamento",
  Fence: "portão cerca", TreePine: "jardim árvore", Flower2: "jardim flor", Sprout: "irrigação horta",
  Leaf: "jardim planta", Battery: "bateria", BatteryCharging: "carregando", Timer: "temporizador",
  AlarmClock: "despertador", Clock: "relógio", CalendarClock: "agenda", Footprints: "presença",
  PersonStanding: "pessoa presença", ScanFace: "reconhecimento facial", Fingerprint: "digital",
  Eye: "visível", EyeOff: "oculto", MapPin: "local", Route: "rota", Cpu: "processador",
  Server: "servidor", HardDrive: "armazenamento", Router: "roteador", Smartphone: "celular",
  Tablet: "tablet", Laptop: "notebook", Printer: "impressora", Wrench: "manutenção",
  Settings: "configuração", ToggleLeft: "desligado", ToggleRight: "ligado", CircleDot: "botão",
  Sparkles: "cena efeito", Star: "favorito", Heart: "favorito", Rocket: "atalho", Bot: "automação",
};

export type AnimacaoIcone =
  | "nenhuma" | "brilho" | "pulsar" | "girar" | "balancar" | "flutuar" | "piscar" | "onda";

export const ANIMACOES: { valor: AnimacaoIcone; label: string }[] = [
  { valor: "brilho", label: "Brilho suave (quando ligado)" },
  { valor: "pulsar", label: "Pulsar" },
  { valor: "girar", label: "Girar (ventilador)" },
  { valor: "balancar", label: "Balançar" },
  { valor: "flutuar", label: "Flutuar" },
  { valor: "piscar", label: "Piscar" },
  { valor: "onda", label: "Onda de luz" },
  { valor: "nenhuma", label: "Sem animação" },
];

/** Classe de animação aplicada quando o elemento está ligado/ativo. */
export function classeAnimacao(a: AnimacaoIcone | undefined, ativo: boolean): string {
  if (!ativo) return "";
  switch (a) {
    case "pulsar": return "animate-[pulse_1.6s_ease-in-out_infinite]";
    case "girar": return "animate-[spin_2.2s_linear_infinite]";
    case "balancar": return "animate-[swing_1.6s_ease-in-out_infinite]";
    case "flutuar": return "animate-[float_2.4s_ease-in-out_infinite]";
    case "piscar": return "animate-[blink_1.2s_steps(2,end)_infinite]";
    case "onda": return "animate-[pulse_2.4s_ease-in-out_infinite]";
    case "nenhuma": return "";
    default: return "drop-shadow-[0_0_10px_hsl(var(--primary))]";
  }
}

export function buscarIcones(termo: string): string[] {
  const t = termo.trim().toLowerCase();
  const nomes = Object.keys(BIBLIOTECA_ICONES);
  if (!t) return nomes;
  return nomes.filter(
    (n) => n.toLowerCase().includes(t) || (APELIDOS_ICONES[n] ?? "").includes(t),
  );
}

export function iconePorNome(nome?: string | null): LucideIcon {
  return (nome && BIBLIOTECA_ICONES[nome]) || Lightbulb;
}
