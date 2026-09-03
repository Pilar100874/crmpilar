import { useEffect } from "react";
import PilarFoneWeb from "@/components/portaria/PilarFoneWeb";

/** Pilar Fone em janela própria — pode ser arrastada para um monitor adicional. */
export default function PilarSipJanela() {
  useEffect(() => {
    document.title = "Pilar Fone";
  }, []);

  return <PilarFoneWeb janela />;
}
