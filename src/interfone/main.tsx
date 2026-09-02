import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import ToasterCentralApk from "@/components/portaria/ToasterCentralApk";
import AppInterfone from "./AppInterfone";
import "../index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToasterCentralApk />
      <AppInterfone />
    </TooltipProvider>
  </QueryClientProvider>,
);
