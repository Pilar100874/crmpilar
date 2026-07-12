import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSonnerPatch } from "./lib/sonnerPatch";

installSonnerPatch();

createRoot(document.getElementById("root")!).render(<App />);
