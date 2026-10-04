import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
import "@fontsource/epilogue/400.css";
import "@fontsource/epilogue/500.css";
import "@fontsource/epilogue/600.css";
import { installSonnerPatch } from "./lib/sonnerPatch";

installSonnerPatch();

// Uma chamada de função do backend pode falhar com 401 ("Não autenticado")
// quando a sessão expira no meio de um polling. Se essa rejeição escapar sem
// tratamento, ela derruba a tela inteira. Aqui absorvemos só esse caso:
// registramos no console e deixamos a tela quieta até o próximo login.
window.addEventListener("unhandledrejection", (evento) => {
  const motivo: any = evento.reason;
  const status = motivo?.context?.status;
  const texto = String(motivo?.message ?? motivo ?? "");
  const eh401 = status === 401 || /\b401\b/.test(texto) || texto.includes("Não autenticado");
  if (eh401) {
    console.warn("[auth] Chamada de função recusada (401) com a sessão expirada; ignorada.", texto);
    evento.preventDefault();
  }
});

// O app nativo (Capacitor) usa um bundle próprio (interfone.html) só com interfone + ramal SIP.


createRoot(document.getElementById("root")!).render(<App />);
