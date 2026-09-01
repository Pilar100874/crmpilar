import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSonnerPatch } from "./lib/sonnerPatch";

installSonnerPatch();

// O app nativo (Capacitor) usa um bundle próprio (interfone.html) só com interfone + ramal SIP.


createRoot(document.getElementById("root")!).render(<App />);
