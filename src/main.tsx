import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSonnerPatch } from "./lib/sonnerPatch";

installSonnerPatch();

// App nativo (Capacitor): os assets são empacotados no APK e abrem na raiz.
// Redireciona para a tela do interfone antes de montar o router.
const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
if (cap?.isNativePlatform?.() && (window.location.pathname === "/" || window.location.pathname === "/index.html")) {
  window.history.replaceState(null, "", "/app/interfone");
}

createRoot(document.getElementById("root")!).render(<App />);
