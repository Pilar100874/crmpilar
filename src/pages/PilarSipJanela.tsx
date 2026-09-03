import { useEffect } from "react";
import PilarFoneWeb from "@/components/portaria/PilarFoneWeb";

/** Pilar Sip em janela própria — pode ser arrastada para um monitor adicional. */
export default function PilarSipJanela() {
  useEffect(() => {
    document.title = "Pilar Sip";
  }, []);

  return <PilarFoneWeb janela />;
}
