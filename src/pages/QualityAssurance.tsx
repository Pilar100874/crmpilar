import { useEffect } from "react";
import QualityAssuranceCRUD from "@/components/config/QualityAssuranceCRUD";

export default function QualityAssurance() {
  useEffect(() => {
    document.title = "Quality Assurance - Sistema";
  }, []);

  return <QualityAssuranceCRUD />;
}
