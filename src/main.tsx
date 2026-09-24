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

// O app nativo (Capacitor) usa um bundle próprio (interfone.html) só com interfone + ramal SIP.


createRoot(document.getElementById("root")!).render(<App />);
