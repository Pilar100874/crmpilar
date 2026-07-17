import { useLocation } from "react-router-dom";
import OpenInNewTabButton from "@/components/OpenInNewTabButton";

/**
 * Rotas onde o botão flutuante "abrir em nova aba" NÃO deve aparecer.
 * Cobre telas públicas / de exibição / dispositivos dedicados.
 */
const HIDDEN_PREFIXES = [
  "/login",
  "/espelho-funcionario",
  "/ponto/totem",
  "/watch",
  "/tv/",
  "/webchat",
  
  "/orcamento/", // link público de orçamento
  "/rastreio",
  "/p/", // páginas públicas
];

function shouldHide(pathname: string): boolean {
  if (pathname === "/") return true; // splash
  return HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Monta o botão flutuante uma única vez, globalmente,
 * fazendo com que apareça em todas as telas do sistema
 * (independente do layout usado — Principal, Ponto, Veículos,
 * Câmeras, E-commerce, POS Mobile, Workflow Builder, etc).
 */
export default function GlobalOpenInNewTabButton() {
  const location = useLocation();
  if (shouldHide(location.pathname)) return null;
  return <OpenInNewTabButton />;
}
