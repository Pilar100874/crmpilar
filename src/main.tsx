import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Importar configuração do ActiveReports para aplicar localização global
import "./lib/activereports-config";

createRoot(document.getElementById("root")!).render(<App />);
