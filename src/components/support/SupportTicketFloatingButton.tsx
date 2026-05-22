import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { SupportTicketDialog, type Step } from "./SupportTicketDialog";

export function SupportTicketFloatingButton() {
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState<Step>("home");
  const location = useLocation();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { step?: Step } | undefined;
      setInitialStep(detail?.step || "home");
      setOpen(true);
    };
    window.addEventListener("open-support-ticket", handler);
    return () => window.removeEventListener("open-support-ticket", handler);
  }, []);

  const hideButton = location.pathname.startsWith("/meus-tickets");

  return (
    <>
      {!hideButton && (
        <Button
          onClick={() => { setInitialStep("home"); setOpen(true); }}
          size="sm"
          className="fixed top-3 right-4 z-50 shadow-md"
          aria-label="Abrir ticket de suporte"
        >
          <Ticket className="h-4 w-4" />
          Abrir Ticket
        </Button>
      )}
      <SupportTicketDialog open={open} onOpenChange={setOpen} initialStep={initialStep} />
    </>
  );
}
